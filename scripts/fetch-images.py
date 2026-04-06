#!/usr/bin/env python3
"""
Mekanlar için görsel çekme agent'ı
Wikipedia, Wikimedia Commons ve Unsplash'tan
"""

import json
import os
from pathlib import Path
from typing import List, Optional
import requests
from colorama import Fore, Style, init

init()

class ImageFetcher:
    """Görsel çeken agent"""
    
    def __init__(self):
        self.data_dir = Path(__file__).parent / "data"
        self.images_dir = Path(__file__).parent / "images"
        self.images_dir.mkdir(exist_ok=True)
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
    def log(self, msg: str, color=Fore.WHITE):
        print(f"{color}{msg}{Style.RESET_ALL}")
        
    def download_image(self, url: str, filename: str) -> bool:
        """Görsel indir"""
        try:
            response = self.session.get(url, timeout=15)
            if response.status_code == 200:
                filepath = self.images_dir / filename
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                return True
            return False
        except Exception as e:
            self.log(f"Indirme hatasi: {e}", Fore.RED)
            return False
            
    def fetch_wikimedia_image(self, search_term: str) -> Optional[str]:
        """Wikimedia Commons'tan görsel ara"""
        try:
            # Wikimedia API
            url = "https://commons.wikimedia.org/w/api.php"
            params = {
                'action': 'query',
                'format': 'json',
                'prop': 'imageinfo',
                'generator': 'search',
                'gsrnamespace': 6,
                'gsrsearch': f"{search_term} Şanlıurfa",
                'iiprop': 'url|size',
                'iiurlwidth': 800
            }
            
            response = self.session.get(url, params=params, timeout=10)
            data = response.json()
            
            pages = data.get('query', {}).get('pages', {})
            for page_id, page_data in pages.items():
                imageinfo = page_data.get('imageinfo', [])
                if imageinfo:
                    return imageinfo[0].get('url')
                    
            return None
        except:
            return None
            
    def fetch_unsplash_image(self, query: str) -> Optional[str]:
        """Unsplash'tan görsel ara (ücretsiz API)"""
        try:
            # Unsplash Source (API key gerekmez)
            url = f"https://source.unsplash.com/800x600/?{query.replace(' ', ',')}"
            
            response = self.session.get(url, allow_redirects=True, timeout=10)
            if response.status_code == 200:
                return response.url
            return None
        except:
            return None
            
    def process_places(self):
        """Mekanları işle ve görsellerini çek"""
        
        # JSON dosyalarını oku
        json_files = list(self.data_dir.glob("*.json"))
        
        for json_file in json_files:
            if json_file.name == 'supabase_inserts.sql':
                continue
                
            self.log(f"\nDosya isleniyor: {json_file.name}", Fore.CYAN)
            
            with open(json_file, 'r', encoding='utf-8') as f:
                places = json.load(f)
                
            for place in places:
                name = place['name']
                slug = place['slug']
                
                self.log(f"  Gorsel aranıyor: {name}", Fore.YELLOW)
                
                # Önce Wikipedia'dan dene
                wiki = place.get('wikipedia', {})
                image_url = wiki.get('image')
                
                # Yoksa Wikimedia'dan ara
                if not image_url:
                    image_url = self.fetch_wikimedia_image(name)
                    
                # Hala yoksa Unsplash'tan ara
                if not image_url:
                    category = place.get('category', 'place')
                    image_url = self.fetch_unsplash_image(f"{name} {category}")
                    
                if image_url:
                    # İndir
                    ext = image_url.split('.')[-1].split('?')[0][:4] or 'jpg'
                    if ext not in ['jpg', 'jpeg', 'png', 'webp']:
                        ext = 'jpg'
                    filename = f"{slug}.{ext}"
                    
                    if self.download_image(image_url, filename):
                        self.log(f"    ✓ İndirildi: {filename}", Fore.GREEN)
                    else:
                        self.log(f"    ✗ İndirilemedi", Fore.RED)
                else:
                    self.log(f"    ✗ Gorsel bulunamadı", Fore.RED)
                    
    def run(self):
        """Ana çalıştırma"""
        self.log("""
╔══════════════════════════════════════════════════════════╗
║           GORSEL INDIRME AGENTI v1.0                    ║
╚══════════════════════════════════════════════════════════╝
        """, Fore.CYAN)
        
        self.process_places()
        
        self.log("\n✓ Tüm işlemler tamamlandı!", Fore.GREEN)
        self.log(f"Görseller: {self.images_dir}", Fore.YELLOW)

if __name__ == "__main__":
    fetcher = ImageFetcher()
    fetcher.run()
