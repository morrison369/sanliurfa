#!/usr/bin/env python3
"""
GELİŞMİŞ GÖRSEL ÇEKME AGENTI
Wikipedia, Wikimedia, DuckDuckGo'dan otomatik görsel çeker
"""

import json
import hashlib
import requests
from pathlib import Path
from urllib.parse import quote_plus, urlparse
from bs4 import BeautifulSoup
from colorama import Fore, Style, init
import time

init()

class ImageScraperAgent:
    """Gelişmiş görsel çekme agentı"""
    
    def __init__(self):
        self.data_dir = Path(__file__).parent / "data"
        self.images_dir = Path(__file__).parent.parent / "public" / "images"
        
        # Kategori klasörleri
        self.category_dirs = {
            'tarihi_yerler': self.images_dir / 'historical',
            'restoranlar': self.images_dir / 'places',
            'oteller': self.images_dir / 'places',
            'gastronomi': self.images_dir / 'foods',
        }
        
        for dir_path in self.category_dirs.values():
            dir_path.mkdir(parents=True, exist_ok=True)
            
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        })
        
        self.stats = {'success': 0, 'failed': 0}
        
    def log(self, msg: str, color=Fore.WHITE):
        print(f"{color}{msg}{Style.RESET_ALL}")
        
    def download_image(self, url: str, filepath: Path) -> bool:
        """Görsel indir ve kaydet"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.google.com/'
            }
            response = self.session.get(url, headers=headers, timeout=20, stream=True)
            
            if response.status_code == 200:
                # Content-Type kontrolü
                content_type = response.headers.get('content-type', '')
                if 'image' not in content_type:
                    return False
                    
                with open(filepath, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                return True
            return False
        except Exception as e:
            return False
            
    def get_wikipedia_image(self, search_term: str) -> str:
        """Wikipedia'dan görsel URL'si al"""
        try:
            # Türkçe Wikipedia'da ara
            wiki_url = f"https://tr.wikipedia.org/wiki/{quote_plus(search_term.replace(' ', '_'))}"
            response = self.session.get(wiki_url, timeout=10)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Infobox'taki resmi bul
                infobox = soup.find('table', {'class': 'infobox'})
                if infobox:
                    img = infobox.find('img')
                    if img:
                        src = img.get('src', '')
                        if src.startswith('//'):
                            return 'https:' + src
                        elif src.startswith('/'):
                            return 'https://tr.wikipedia.org' + src
                            
                # İlk resmi bul
                content = soup.find('div', {'id': 'mw-content-text'})
                if content:
                    img = content.find('img')
                    if img:
                        src = img.get('src', '')
                        if src.startswith('//'):
                            return 'https:' + src
                            
            return None
        except:
            return None
            
    def get_wikimedia_commons_image(self, search_term: str) -> str:
        """Wikimedia Commons'tan görsel ara"""
        try:
            search_url = f"https://commons.wikimedia.org/w/index.php?search={quote_plus(search_term + ' Şanlıurfa')}&title=Special:MediaSearch&type=image"
            response = self.session.get(search_url, timeout=10)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Görsel sonuçlarını bul
                images = soup.find_all('img', {'class': 'sd-image'})
                for img in images[:3]:  # İlk 3'ünü dene
                    src = img.get('src', '')
                    if src and 'upload.wikimedia.org' in src:
                        # Thumbnail yerine orijinali al
                        src = src.replace('/thumb/', '/')
                        if '/thumb/' in src:
                            parts = src.split('/')
                            if len(parts) > 2:
                                src = '/'.join(parts[:-1])  # Son parçayı at
                        return src
                        
            return None
        except:
            return None
            
    def get_duckduckgo_image(self, search_term: str) -> str:
        """DuckDuckGo'dan görsel ara"""
        try:
            # DuckDuckGo görsel arama
            url = f"https://duckduckgo.com/?q={quote_plus(search_term + ' Şanlıurfa')}&iax=images&ia=images"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                # JavaScript yüklenen sayfalar için basit regex
                import re
                
                # JSON'dan görsel URL'leri çıkar
                image_urls = re.findall(r'https?://[^\s\"]+\.(?:jpg|jpeg|png|webp)', response.text)
                
                for url in image_urls:
                    if any(domain in url for domain in ['wikimedia', 'wikipedia', 'cloudfront', 'static']):
                        return url
                        
            return None
        except:
            return None
            
    def get_placeholder_image(self, text: str, width: int = 800, height: int = 600) -> str:
        """Placeholder görsel URL oluştur"""
        # placehold.co kullan
        encoded_text = quote_plus(text[:30])
        return f"https://placehold.co/{width}x{height}/A18072/FFFFFF/png?text={encoded_text}"
        
    def fetch_image_for_place(self, place: dict, category: str) -> str:
        """Bir mekan için görsel bul"""
        name = place['name']
        search_terms = [
            name,
            f"{name} Şanlıurfa",
            place.get('wikipedia', {}).get('title', name),
        ]
        
        image_url = None
        
        # 1. Wikipedia dene
        for term in search_terms[:2]:
            image_url = self.get_wikipedia_image(term)
            if image_url:
                self.log(f"    Wikipedia'dan bulundu", Fore.GREEN)
                return image_url
            time.sleep(0.3)
            
        # 2. Wikimedia Commons dene
        for term in search_terms[:2]:
            image_url = self.get_wikimedia_commons_image(term)
            if image_url:
                self.log(f"    Wikimedia Commons'tan bulundu", Fore.GREEN)
                return image_url
            time.sleep(0.3)
            
        # 3. DuckDuckGo dene
        image_url = self.get_duckduckgo_image(search_terms[0])
        if image_url:
            self.log(f"    DuckDuckGo'dan bulundu", Fore.GREEN)
            return image_url
            
        return None
        
    def process_all_places(self):
        """Tüm mekanları işle"""
        json_files = [
            ('tarihi_yerler.json', 'tarihi_yerler'),
            ('restoranlar.json', 'restoranlar'),
            ('oteller.json', 'oteller'),
            ('gastronomi.json', 'gastronomi'),
        ]
        
        for filename, category in json_files:
            filepath = self.data_dir / filename
            if not filepath.exists():
                self.log(f"Dosya bulunamadı: {filename}", Fore.RED)
                continue
                
            self.log(f"\n{'='*60}", Fore.CYAN)
            self.log(f"KATEGORI: {category.upper()}", Fore.CYAN)
            self.log(f"{'='*60}\n", Fore.CYAN)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                places = json.load(f)
                
            for place in places:
                name = place['name']
                slug = place['slug']
                
                self.log(f"[{category}] {name}", Fore.YELLOW)
                
                # Görsel klasörünü belirle
                target_dir = self.category_dirs.get(category, self.images_dir / 'places')
                
                # Dosya adı
                safe_name = "".join(c for c in slug if c.isalnum() or c in '-_').lower()
                image_path = target_dir / f"{safe_name}.jpg"
                
                # Zaten varsa atla
                if image_path.exists():
                    self.log(f"    Zaten var, atlanıyor", Fore.BLUE)
                    self.stats['success'] += 1
                    continue
                    
                # Görsel URL'si bul
                image_url = self.fetch_image_for_place(place, category)
                
                if image_url:
                    # İndir
                    if self.download_image(image_url, image_path):
                        self.log(f"    ✓ Kaydedildi: {image_path.name}", Fore.GREEN)
                        self.stats['success'] += 1
                    else:
                        self.log(f"    ✗ İndirilemedi, placeholder kullanılıyor", Fore.RED)
                        # Placeholder kullan
                        placeholder_url = self.get_placeholder_image(name)
                        self.download_image(placeholder_url, image_path)
                        self.stats['failed'] += 1
                else:
                    self.log(f"    ✗ URL bulunamadı, placeholder kullanılıyor", Fore.RED)
                    placeholder_url = self.get_placeholder_image(name)
                    self.download_image(placeholder_url, image_path)
                    self.stats['failed'] += 1
                    
                time.sleep(0.5)  # Rate limiting
                
    def generate_image_mapping(self):
        """Görsel eşleştirme dosyası oluştur"""
        mapping = {}
        
        for category, dir_path in self.category_dirs.items():
            if dir_path.exists():
                for img_file in dir_path.glob("*.jpg"):
                    slug = img_file.stem
                    rel_path = f"/images/{dir_path.name}/{img_file.name}"
                    mapping[slug] = rel_path
                    
        # Kaydet
        mapping_file = self.data_dir / "image_mapping.json"
        with open(mapping_file, 'w', encoding='utf-8') as f:
            json.dump(mapping, f, ensure_ascii=False, indent=2)
            
        self.log(f"\nGörsel eşleştirme kaydedildi: {mapping_file}", Fore.GREEN)
        return mapping
        
    def run(self):
        """Ana çalıştırma"""
        self.log("""
╔══════════════════════════════════════════════════════════╗
║        GELİŞMİŞ GÖRSEL ÇEKME AGENTI v2.0                ║
║     Wikipedia + Wikimedia + DuckDuckGo                 ║
╚══════════════════════════════════════════════════════════╝
        """, Fore.CYAN)
        
        self.process_all_places()
        mapping = self.generate_image_mapping()
        
        self.log("\n" + "="*60, Fore.GREEN)
        self.log("İŞLEM TAMAMLANDI!", Fore.GREEN)
        self.log("="*60, Fore.GREEN)
        self.log(f"\nBaşarılı: {self.stats['success']}", Fore.GREEN)
        self.log(f"Başarısız/Placeholder: {self.stats['failed']}", Fore.YELLOW)
        self.log(f"\nGörseller şurada: {self.images_dir}", Fore.CYAN)
        
if __name__ == "__main__":
    agent = ImageScraperAgent()
    agent.run()
