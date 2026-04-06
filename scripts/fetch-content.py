#!/usr/bin/env python3
"""
Şanlıurfa.com İçerik Çekme Scripti
Wikipedia, Wikidata, OpenStreetMap API'lerini kullanır
"""

import json
import os
import time
import requests
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from tqdm import tqdm
import colorama
from colorama import Fore, Style

# Colorama başlat
colorama.init()

class ContentFetcher:
    """Şanlıurfa içeriklerini çeken ana sınıf"""
    
    def __init__(self):
        self.data_dir = Path(__file__).parent / "data"
        self.images_dir = Path(__file__).parent / "images"
        self.data_dir.mkdir(exist_ok=True)
        self.images_dir.mkdir(exist_ok=True)
        
        # API URL'leri
        self.wiki_api = "https://tr.wikipedia.org/api/rest_v1/page/summary/"
        self.wiki_search_api = "https://tr.wikipedia.org/w/api.php"
        self.osm_api = "https://nominatim.openstreetmap.org/search"
        
        # Kategoriler
        self.categories = {
            "tarihi_yerler": [
                ("Göbeklitepe", "gobeklitepe"),
                ("Balıklıgöl", "balikligol"),
                ("Harran", "harran"),
                ("Halfeti", "halfeti"),
                ("Şanlıurfa Kalesi", "urfa_kalesi"),
                ("Şanlıurfa Arkeoloji Müzesi", "arkeoloji_muzesi"),
            ],
            "gastronomi": [
                ("Urfa kebabı", "urfa_kebabi"),
                ("Çiğ köfte", "cig_kofte"),
                ("Şıllık tatlısı", "sillik_tatlisi"),
            ]
        }
        
    def print_header(self, text: str):
        """Başlık yazdır"""
        print(f"\n{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{text}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}\n")
        
    def print_success(self, text: str):
        """Başarılı mesaj yazdır"""
        print(f"{Fore.GREEN}✓ {text}{Style.RESET_ALL}")
        
    def print_error(self, text: str):
        """Hata mesajı yazdır"""
        print(f"{Fore.RED}✗ {text}{Style.RESET_ALL}")
        
    def print_info(self, text: str):
        """Bilgi mesajı yazdır"""
        print(f"{Fore.YELLOW}→ {text}{Style.RESET_ALL}")
        
    def fetch_wikipedia(self, query: str) -> Optional[Dict]:
        """Wikipedia'dan içerik çek"""
        try:
            # Önce Türkçe Wikipedia'da ara
            url = f"{self.wiki_api}{requests.utils.quote(query)}"
            headers = {
                'User-Agent': 'SanliurfaBot/1.0 (info@sanliurfa.com)'
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'title': data.get('title', query),
                    'extract': data.get('extract', ''),
                    'description': data.get('description', ''),
                    'thumbnail': data.get('thumbnail', {}).get('source', ''),
                    'page_url': data.get('content_urls', {}).get('desktop', {}).get('page', ''),
                    'coordinates': data.get('coordinates', {}),
                }
            return None
        except Exception as e:
            self.print_error(f"Wikipedia hatası ({query}): {str(e)}")
            return None
            
    def fetch_osm_coordinates(self, query: str, city: str = "Şanlıurfa") -> Optional[Dict]:
        """OpenStreetMap'den koordinat çek"""
        try:
            params = {
                'q': f"{query}, {city}, Turkey",
                'format': 'json',
                'limit': 1
            }
            headers = {
                'User-Agent': 'SanliurfaBot/1.0 (info@sanliurfa.com)'
            }
            
            response = requests.get(self.osm_api, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data:
                    return {
                        'lat': float(data[0]['lat']),
                        'lon': float(data[0]['lon']),
                        'display_name': data[0]['display_name'],
                        'osm_type': data[0]['type'],
                    }
            return None
        except Exception as e:
            self.print_error(f"OSM hatası ({query}): {str(e)}")
            return None
            
    def fetch_historical_sites(self) -> List[Dict]:
        """Tarihi yerleri çek"""
        self.print_header("TARİHİ YERLER ÇEKİLİYOR")
        
        sites = []
        for name, slug in tqdm(self.categories['tarihi_yerler'], desc="Tarihi Yerler"):
            self.print_info(f"Çekiliyor: {name}")
            
            # Wikipedia'dan içerik al
            wiki_data = self.fetch_wikipedia(name)
            time.sleep(0.5)  # Rate limiting
            
            # OSM'den koordinat al
            osm_data = self.fetch_osm_coordinates(name)
            time.sleep(0.5)  # Rate limiting
            
            if wiki_data or osm_data:
                site = {
                    'id': slug,
                    'name': name,
                    'slug': slug,
                    'category': 'tarihi_yerler',
                    'wikipedia_data': wiki_data,
                    'coordinates': osm_data,
                    'fetched_at': datetime.now().isoformat()
                }
                sites.append(site)
                self.print_success(f"{name} çekildi")
            else:
                self.print_error(f"{name} bulunamadı")
                
        return sites
        
    def fetch_foods(self) -> List[Dict]:
        """Yemekleri çek"""
        self.print_header("GASTRONOMİ ÇEKİLİYOR")
        
        foods = []
        for name, slug in tqdm(self.categories['gastronomi'], desc="Yemekler"):
            self.print_info(f"Çekiliyor: {name}")
            
            wiki_data = self.fetch_wikipedia(name)
            time.sleep(0.5)
            
            if wiki_data:
                food = {
                    'id': slug,
                    'name': name,
                    'slug': slug,
                    'category': 'gastronomi',
                    'wikipedia_data': wiki_data,
                    'fetched_at': datetime.now().isoformat()
                }
                foods.append(food)
                self.print_success(f"{name} çekildi")
            else:
                self.print_error(f"{name} bulunamadı")
                
        return foods
        
    def save_to_json(self, data: List[Dict], filename: str):
        """Veriyi JSON olarak kaydet"""
        filepath = self.data_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        self.print_success(f"Veriler kaydedildi: {filepath}")
        
    def generate_markdown_content(self, sites: List[Dict], foods: List[Dict]):
        """Markdown içerik oluştur"""
        self.print_header("MARKDOWN İÇERİKLERİ OLUŞTURULUYOR")
        
        # Tarihi yerler için
        md_dir = self.data_dir / "markdown"
        md_dir.mkdir(exist_ok=True)
        
        for site in sites:
            slug = site['slug']
            wiki = site.get('wikipedia_data', {})
            coords = site.get('coordinates', {})
            
            content = f"""---
title: "{site['name']}"
description: "{wiki.get('description', '')}"
slug: "{slug}"
category: "tarihi-yerler"
{"coordinates: " + json.dumps(coords) if coords else "coordinates: null"}
---

# {site['name']}

{wiki.get('extract', 'İçerik hazırlanıyor...')}

## Konum

{"Enlem: " + str(coords.get('lat', 'Bilinmiyor')) if coords else "Enlem: Bilinmiyor"}  
{"Boylam: " + str(coords.get('lon', 'Bilinmiyor')) if coords else "Boylam: Bilinmiyor"}

## Daha Fazla Bilgi

[Wikipedia'da görüntüle]({wiki.get('page_url', '')})
"""
            filepath = md_dir / f"{slug}.md"
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
                
        self.print_success(f"Markdown dosyaları oluşturuldu: {md_dir}")
        
    def run(self):
        """Ana çalıştırma fonksiyonu"""
        print(f"""
{Fore.CYAN}
   ____  _              _   _            _                 
  / ___|| | __ _ _ __  | | | | __ _  ___| | _____ _ __ ___ 
  \___ \| |/ _` | '__| | |_| |/ _` |/ __| |/ / _ \ '__/ __|
   ___) | | (_| | |    |  _  | (_| | (__|   <  __/ |  \__ \\
  |____/|_|\__,_|_|    |_| |_|\__,_|\___|_|\_\___|_|  |___/
                                                          
{Style.RESET_ALL}
        """)
        
        self.print_info("Şanlıurfa.com İçerik Çekme Scripti")
        self.print_info(f"Başlangıç: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Tarihi yerleri çek
        sites = self.fetch_historical_sites()
        self.save_to_json(sites, "historical_sites.json")
        
        # Yemekleri çek
        foods = self.fetch_foods()
        self.save_to_json(foods, "foods.json")
        
        # Markdown oluştur
        self.generate_markdown_content(sites, foods)
        
        self.print_header("İŞLEM TAMAMLANDI")
        self.print_success(f"Toplam {len(sites)} tarihi yer çekildi")
        self.print_success(f"Toplam {len(foods)} yemek çekildi")
        self.print_info(f"Veriler: {self.data_dir}")
        self.print_info(f"Görseller: {self.images_dir}")

if __name__ == "__main__":
    fetcher = ContentFetcher()
    fetcher.run()
