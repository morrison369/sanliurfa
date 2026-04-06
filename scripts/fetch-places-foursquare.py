#!/usr/bin/env python3
"""
Foursquare Places API ile mekan çekme
Ücretsiz tier: 500 API çağrısı/gün
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import requests
import colorama
from colorama import Fore, Style
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

colorama.init()

class FoursquareFetcher:
    """Foursquare API'den mekan çeken sınıf"""
    
    def __init__(self):
        self.api_key = os.getenv("FOURSQUARE_API_KEY")
        if not self.api_key:
            print(f"{Fore.YELLOW}UYARI: FOURSQUARE_API_KEY bulunamadı. .env dosyasına ekleyin.{Style.RESET_ALL}")
            print(f"{Fore.CYAN}API Key almak için: https://foursquare.com/developers{Style.RESET_ALL}")
            self.api_key = "demo_key"
            
        self.base_url = "https://api.foursquare.com/v3"
        self.data_dir = Path(__file__).parent / "data"
        self.data_dir.mkdir(exist_ok=True)
        
        # Şanlıurfa koordinatları
        self.sanliurfa_coords = {
            'lat': 37.1591,
            'lng': 38.7969
        }
        
    def print_success(self, text: str):
        print(f"{Fore.GREEN}✓ {text}{Style.RESET_ALL}")
        
    def print_error(self, text: str):
        print(f"{Fore.RED}✗ {text}{Style.RESET_ALL}")
        
    def print_info(self, text: str):
        print(f"{Fore.YELLOW}→ {text}{Style.RESET_ALL}")
        
    def search_places(self, query: str, category: str = None, radius: int = 10000, limit: int = 20) -> List[Dict]:
        """Mekan ara"""
        try:
            url = f"{self.base_url}/places/search"
            headers = {
                "Accept": "application/json",
                "Authorization": self.api_key
            }
            params = {
                "query": query,
                "ll": f"{self.sanliurfa_coords['lat']},{self.sanliurfa_coords['lng']}",
                "radius": radius,
                "limit": limit,
                "fields": "fsq_id,name,description,geocodes,location,categories,rating,photos,tel,website,hours"
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('results', [])
            elif response.status_code == 401:
                self.print_error("API Key geçersiz! Foursquare'den yeni key alın.")
                return []
            else:
                self.print_error(f"API Hatası: {response.status_code}")
                return []
                
        except Exception as e:
            self.print_error(f"Arama hatası: {str(e)}")
            return []
            
    def fetch_category(self, name: str, query: str, category_code: str = None) -> List[Dict]:
        """Kategori bazlı mekan çek"""
        self.print_info(f"'{name}' kategorisi çekiliyor...")
        
        places = self.search_places(query, category_code)
        results = []
        
        for place in places:
            try:
                location = place.get('location', {})
                geocodes = place.get('geocodes', {}).get('main', {})
                
                data = {
                    'foursquare_id': place.get('fsq_id'),
                    'name': place.get('name'),
                    'description': place.get('description', ''),
                    'address': location.get('formatted_address', ''),
                    'phone': place.get('tel', ''),
                    'website': place.get('website', ''),
                    'latitude': geocodes.get('latitude'),
                    'longitude': geocodes.get('longitude'),
                    'rating': place.get('rating', 0) / 2 if place.get('rating') else 0,  # Foursquare 10 üzerinden
                    'category': name,
                    'hours': place.get('hours', {}).get('display', ''),
                    'photos': [p.get('prefix') + 'original' + p.get('suffix') for p in place.get('photos', [])[:3]],
                    'fetched_at': datetime.now().isoformat()
                }
                results.append(data)
            except Exception as e:
                continue
                
        self.print_success(f"{len(results)} mekan bulundu: {name}")
        return results
        
    def fetch_all_categories(self):
        """Tüm kategorileri çek"""
        print(f"""
{Fore.CYAN}
  _____                         _                    
 |  ___|__  _ __ _ __ ___ _ __ | |__   _____      __ 
 | |_ / _ \| '__| '__/ _ \ '_ \| '_ \ / _ \ \ /\ / / 
 |  _| (_) | |  | | |  __/ | | | | | | (_) \ V  V /  
 |_|  \___/|_|  |_|  \___|_| |_|_| |_|\___/ \_/\_/   
                                                      
{Style.RESET_ALL}
        """)
        
        categories = [
            ("restaurant", "restoran kebap", None),
            ("cafe", "kahve cafe", "13035"),
            ("hotel", "otel", "19014"),
            ("museum", "müze", "10028"),
        ]
        
        all_places = []
        
        for cat_name, query, cat_code in categories:
            places = self.fetch_category(cat_name, query, cat_code)
            all_places.extend(places)
            
        # Kaydet
        filepath = self.data_dir / "foursquare_places.json"
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(all_places, f, ensure_ascii=False, indent=2)
            
        self.print_success(f"Toplam {len(all_places)} mekan kaydedildi: {filepath}")
        return all_places
        
    def convert_to_supabase_format(self, places: List[Dict]):
        """Supabase formatına çevir"""
        supabase_places = []
        
        for place in places:
            slug = place['name'].lower().replace(' ', '-').replace('ı', 'i')[:50]
            
            data = {
                'name': place['name'],
                'slug': slug,
                'description': place['description'] or f"{place['name']} Şanlıurfa'da popüler bir mekan.",
                'category': place['category'],
                'address': place['address'],
                'phone': place['phone'],
                'website': place['website'],
                'latitude': place['latitude'],
                'longitude': place['longitude'],
                'rating': place['rating'],
                'cover_image': place['photos'][0] if place['photos'] else f"/images/places/{slug}.jpg",
                'opening_hours': {'display': place['hours']} if place['hours'] else None,
                'tags': [place['category'], 'Şanlıurfa', 'Mekan'],
            }
            supabase_places.append(data)
            
        filepath = self.data_dir / "places_supabase_format.json"
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(supabase_places, f, ensure_ascii=False, indent=2)
            
        self.print_success(f"Supabase formatında kaydedildi: {filepath}")

if __name__ == "__main__":
    fetcher = FoursquareFetcher()
    places = fetcher.fetch_all_categories()
    fetcher.convert_to_supabase_format(places)
