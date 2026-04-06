#!/usr/bin/env python3
"""
Çekilen içerikleri Supabase'e aktarma scripti
"""

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
import colorama
from colorama import Fore, Style

# .env dosyasını yükle
load_dotenv(Path(__file__).parent.parent / ".env")

colorama.init()

class SupabaseImporter:
    """Supabase'e veri aktaran sınıf"""
    
    def __init__(self):
        self.supabase_url = os.getenv("PUBLIC_SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("PUBLIC_SUPABASE_ANON_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Supabase URL ve API Key gerekli! .env dosyasını kontrol edin.")
            
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.data_dir = Path(__file__).parent / "data"
        
    def print_success(self, text: str):
        print(f"{Fore.GREEN}✓ {text}{Style.RESET_ALL}")
        
    def print_error(self, text: str):
        print(f"{Fore.RED}✗ {text}{Style.RESET_ALL}")
        
    def print_info(self, text: str):
        print(f"{Fore.YELLOW}→ {text}{Style.RESET_ALL}")
        
    def import_historical_sites(self):
        """Tarihi yerleri içe aktar"""
        filepath = self.data_dir / "historical_sites.json"
        if not filepath.exists():
            self.print_error("historical_sites.json bulunamadı!")
            return
            
        with open(filepath, 'r', encoding='utf-8') as f:
            sites = json.load(f)
            
        self.print_info(f"{len(sites)} tarihi yer içe aktarılıyor...")
        
        for site in sites:
            try:
                wiki = site.get('wikipedia_data', {})
                coords = site.get('coordinates', {})
                
                data = {
                    'id': str(uuid.uuid4()),
                    'slug': site['slug'],
                    'name': site['name'],
                    'title': wiki.get('description', f"{site['name']} - Şanlıurfa"),
                    'description': wiki.get('extract', '')[:500],
                    'short_description': wiki.get('description', ''),
                    'history': wiki.get('extract', ''),
                    'significance': f"{site['name']} Şanlıurfa'nın önemli tarihi yerlerinden biridir.",
                    'location': coords.get('display_name', 'Şanlıurfa, Türkiye') if coords else 'Şanlıurfa, Türkiye',
                    'latitude': coords.get('lat', 37.1591) if coords else 37.1591,
                    'longitude': coords.get('lon', 38.7969) if coords else 38.7969,
                    'cover_image': wiki.get('thumbnail', f"/images/historical/{site['slug']}.jpg"),
                    'visiting_hours': '08:00 - 18:00',
                    'entrance_fee': 'Ücretli',
                    'is_unesco': site['slug'] == 'gobeklitepe',
                    'period': self._detect_period(site['slug']),
                    'tips': self._get_tips(site['slug']),
                    'tags': self._get_tags(site['slug']),
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat(),
                }
                
                # Supabase'e ekle
                result = self.supabase.table('historical_sites').upsert(data).execute()
                self.print_success(f"{site['name']} aktarıldı")
                
            except Exception as e:
                self.print_error(f"{site['name']} aktarılamadı: {str(e)}")
                
    def import_foods(self):
        """Yemekleri içe aktar"""
        filepath = self.data_dir / "foods.json"
        if not filepath.exists():
            self.print_error("foods.json bulunamadı!")
            return
            
        with open(filepath, 'r', encoding='utf-8') as f:
            foods = json.load(f)
            
        self.print_info(f"{len(foods)} yemek içe aktarılıyor...")
        
        for food in foods:
            try:
                wiki = food.get('wikipedia_data', {})
                
                data = {
                    'id': str(uuid.uuid4()),
                    'slug': food['slug'],
                    'name': food['name'],
                    'description': wiki.get('extract', '')[:300],
                    'history': f"{food['name']} Şanlıurfa mutfağının vazgeçilmez lezzetlerindendir.",
                    'ingredients': self._get_ingredients(food['slug']),
                    'where_to_eat': ['Tarihi ciğerciler', 'Merkezi lokantalar'],
                    'cover_image': f"/images/foods/{food['slug']}.jpg",
                    'is_vegetarian': food['slug'] in ['sillik_tatlisi'],
                    'is_spicy': food['slug'] in ['cig_kofte', 'urfa_kebabi'],
                    'difficulty': 'hard' if food['slug'] == 'cig_kofte' else 'medium',
                    'prep_time': self._get_prep_time(food['slug']),
                    'rating': 4.8,
                    'review_count': 0,
                    'tags': self._get_food_tags(food['slug']),
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat(),
                }
                
                result = self.supabase.table('foods').upsert(data).execute()
                self.print_success(f"{food['name']} aktarıldı")
                
            except Exception as e:
                self.print_error(f"{food['name']} aktarılamadı: {str(e)}")
                
    def _detect_period(self, slug: str) -> str:
        """Dönem tespiti"""
        periods = {
            'gobeklitepe': 'M.Ö. 9600',
            'harran': 'M.Ö. 2000',
            'balikligol': 'Antik Çağ',
            'halfeti': 'Antik Çağ',
            'urfa_kalesi': 'M.Ö. 2000',
            'arkeoloji_muzesi': 'Çağdaş',
        }
        return periods.get(slug, 'Tarihi Dönem')
        
    def _get_tips(self, slug: str) -> list:
        """Ziyaret ipuçları"""
        tips = {
            'gobeklitepe': [
                'Sabah erken saatlerde gidin',
                'Rehberli tur önerilir',
                'Güneş kremi ve şapka getirin',
                'Fotoğraf makinesi unutmayın'
            ],
            'balikligol': [
                'Gün batımında gidin',
                'Balıkları besleyin',
                'Çevresindeki camileri ziyaret edin'
            ],
            'harran': [
                'Kaleyi ziyaret edin',
                'Konik kümbet evleri görün',
                'Gün batımı için ideal'
            ],
            'halfeti': [
                'Tekne turuna katılın',
                'Rumkale manzarasını izleyin',
                'Yerel balık restoranlarını deneyin'
            ],
        }
        return tips.get(slug, ['Erken saatte gidin', 'Rehber almayı düşünün'])
        
    def _get_tags(self, slug: str) -> list:
        """Etiketler"""
        tags = {
            'gobeklitepe': ['UNESCO', 'Arkeoloji', 'Tarih', 'Tapınak', 'Ören Yeri'],
            'balikligol': ['İnanç Turizmi', 'Tarih', 'Dini', 'Şehir Merkezi'],
            'harran': ['Tarih', 'Mimari', 'Kültür', 'Üniversite'],
            'halfeti': ['Doğa', 'Tekne Turu', 'Baraj Gölü', 'Fotoğrafçılık'],
        }
        return tags.get(slug, ['Tarih', 'Kültür', 'Turizm'])
        
    def _get_ingredients(self, slug: str) -> list:
        """Yemek malzemeleri"""
        ingredients = {
            'urfa_kebabi': ['Kuzu kıyma', 'İsot', 'Tuz', 'Karabiber', 'Maydanoz'],
            'cig_kofte': ['Bulgur', 'İsot', 'Domates salçası', 'Nar ekşisi', 'Maydanoz'],
            'sillik_tatlisi': ['Yufka', 'Ceviz', 'Süt', 'Şeker', 'Vanilya'],
        }
        return ingredients.get(slug, ['Geleneksel malzemeler'])
        
    def _get_prep_time(self, slug: str) -> str:
        """Hazırlık süresi"""
        times = {
            'urfa_kebabi': '45 dk',
            'cig_kofte': '2 saat',
            'sillik_tatlisi': '1 saat',
        }
        return times.get(slug, '1 saat')
        
    def _get_food_tags(self, slug: str) -> list:
        """Yemek etiketleri"""
        tags = {
            'urfa_kebabi': ['Et', 'Kebap', 'Izgara', 'Akşam Yemeği'],
            'cig_kofte': ['Vegan', 'Baharatlı', 'Ara Öğün', 'Geleneksel'],
            'sillik_tatlisi': ['Tatlı', 'Cevizli', 'Fırın', 'Ramazan'],
        }
        return tags.get(slug, ['Geleneksel', 'Yerel Lezzet'])
        
    def run(self):
        """Ana çalıştırma"""
        print(f"""
{Fore.CYAN}
   ____                       _       _           
  / ___| _   _ _ __ ___  __ _| | __ _| |__  _   _ 
  \___ \| | | | '_ ` _ \/ _` | |/ _` | '_ \| | | |
   ___) | |_| | | | | | | (_| | | (_| | |_) | |_| |
  |____/ \__,_|_| |_| |_|\__,_|_|\__,_|_.__/ \__, |
                                            |___/ 
{Style.RESET_ALL}
        """)
        
        self.print_info("Supabase İçerik Aktarımı")
        self.print_info(f"Supabase URL: {self.supabase_url[:30]}...")
        
        try:
            self.import_historical_sites()
            self.import_foods()
            self.print_success("Tüm içerikler başarıyla aktarıldı!")
        except Exception as e:
            self.print_error(f"Aktarım hatası: {str(e)}")

if __name__ == "__main__":
    importer = SupabaseImporter()
    importer.run()
