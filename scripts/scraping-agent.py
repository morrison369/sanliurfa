#!/usr/bin/env python3
"""
Şanlıurfa Web Scraping Agent v3.0
API kullanmadan web'den içerik çeken otomatik agent
Kategoriler: Tarihi Yerler, Restoranlar, Oteller, Kafeler, vb.
"""

import json
import re
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup
from colorama import Fore, Style, init

init()

class WebScrapingAgent:
    """Web'den içerik çeken akıllı agent"""
    
    def __init__(self):
        self.data_dir = Path(__file__).parent / "data"
        self.data_dir.mkdir(exist_ok=True)
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        })
        
        # Kategori tanımları (82 mekan)
        self.categories = {
            'tarihi_yerler': [
                {'name': 'Göbeklitepe', 'slug': 'gobeklitepe', 'search': 'Göbeklitepe Şanlıurfa'},
                {'name': 'Balıklıgöl', 'slug': 'balikligol', 'search': 'Balıklıgöl Şanlıurfa'},
                {'name': 'Harran', 'slug': 'harran', 'search': 'Harran Şanlıurfa'},
                {'name': 'Halfeti', 'slug': 'halfeti', 'search': 'Halfeti Şanlıurfa'},
                {'name': 'Şanlıurfa Kalesi', 'slug': 'urfa-kalesi', 'search': 'Şanlıurfa Kalesi'},
                {'name': 'Şanlıurfa Arkeoloji Müzesi', 'slug': 'arkeoloji-muzesi', 'search': 'Şanlıurfa Arkeoloji Müzesi'},
                {'name': 'Rızvaniye Camii', 'slug': 'rizvaniye-camii', 'search': 'Rızvaniye Camii Şanlıurfa'},
                {'name': 'Eyyüp Peygamber Makamı', 'slug': 'eyyup-peygamber', 'search': 'Eyyüp Peygamber Makamı Şanlıurfa'},
            ],
            'restoranlar': [
                {'name': 'Ciğerci Aziz', 'slug': 'cigerci-aziz', 'search': 'Ciğerci Aziz Şanlıurfa'},
                {'name': 'Meşhur Çiğköfteci', 'slug': 'mesur-cigkofteci', 'search': 'Meşhur Çiğköfteci Şanlıurfa'},
                {'name': 'Zahter Kahvaltı Evi', 'slug': 'zahter-kahvalti', 'search': 'Zahter Kahvaltı Evi Şanlıurfa'},
                {'name': 'Cevahir Konak', 'slug': 'cevahir-konak', 'search': 'Cevahir Konak Şanlıurfa'},
                {'name': 'Kebap Sarayı', 'slug': 'kebap-sarayi', 'search': 'Kebap Sarayı Şanlıurfa'},
                {'name': 'Lahmacun Ustası', 'slug': 'lahmacun-ustasi', 'search': 'Lahmacun Ustası Şanlıurfa'},
                {'name': 'Çorba Evi', 'slug': 'corba-evi', 'search': 'Çorba Evi Şanlıurfa'},
                {'name': 'Tatlı Dünyası', 'slug': 'tatli-dunyasi', 'search': 'Tatlı Dünyası Şanlıurfa'},
                {'name': 'İsot Lounge', 'slug': 'isot-lounge', 'search': 'İsot Lounge Şanlıurfa'},
                {'name': 'Balıkçı Hamza', 'slug': 'balikci-hamza', 'search': 'Balıkçı Hamza Şanlıurfa'},
                {'name': 'Bolu Mengen', 'slug': 'bolu-mengen', 'search': 'Bolu Mengen Şanlıurfa'},
                {'name': 'Pilav Ustası', 'slug': 'pilav-ustasi', 'search': 'Pilav Ustası Şanlıurfa'},
            ],
            'oteller': [
                {'name': 'Hotel Manço', 'slug': 'hotel-manco', 'search': 'Hotel Manço Şanlıurfa'},
                {'name': 'El Ruha Hotel', 'slug': 'el-ruha', 'search': 'El Ruha Hotel Şanlıurfa'},
                {'name': 'Nevali Hotel', 'slug': 'nevali', 'search': 'Nevali Hotel Şanlıurfa'},
                {'name': 'Divan Şanlıurfa', 'slug': 'divan', 'search': 'Divan Şanlıurfa'},
                {'name': 'Hilton Garden Inn', 'slug': 'hilton', 'search': 'Hilton Garden Inn Şanlıurfa'},
                {'name': 'Courtyard by Marriott', 'slug': 'courtyard', 'search': 'Courtyard by Marriott Şanlıurfa'},
                {'name': 'Gap Hotel', 'slug': 'gap-hotel', 'search': 'Gap Hotel Şanlıurfa'},
                {'name': 'Konak Butik Otel', 'slug': 'konak-otel', 'search': 'Konak Butik Otel Şanlıurfa'},
            ],
            'kafeler': [
                {'name': 'Gümrükhan Cafe', 'slug': 'gumrukhan-cafe', 'search': 'Gümrükhan Cafe Şanlıurfa'},
                {'name': 'Nargile Cafe', 'slug': 'nargile-cafe', 'search': 'Nargile Cafe Şanlıurfa'},
                {'name': 'Kahve Dünyası', 'slug': 'kahve-dunyasi', 'search': 'Kahve Dünyası Şanlıurfa'},
                {'name': 'Starbucks', 'slug': 'starbucks', 'search': 'Starbucks Şanlıurfa'},
                {'name': 'Espresso Lab', 'slug': 'espresso-lab', 'search': 'Espresso Lab Şanlıurfa'},
                {'name': 'Kocatepe Kahve', 'slug': 'kocatepe', 'search': 'Kocatepe Kahve Şanlıurfa'},
                {'name': 'Coffy', 'slug': 'coffy', 'search': 'Coffy Şanlıurfa'},
                {'name': 'Books Cafe', 'slug': 'books-cafe', 'search': 'Books Cafe Şanlıurfa'},
                {'name': 'Rota Cafe', 'slug': 'rota-cafe', 'search': 'Rota Cafe Şanlıurfa'},
                {'name': 'Kumsal Cafe', 'slug': 'kumsal-cafe', 'search': 'Kumsal Cafe Şanlıurfa'},
            ],
        }
        
    def log(self, message: str, color: str = Fore.WHITE):
        print(f"{color}{message}{Style.RESET_ALL}")
        
    def success(self, message: str):
        self.log(f"✓ {message}", Fore.GREEN)
        
    def error(self, message: str):
        self.log(f"✗ {message}", Fore.RED)
        
    def info(self, message: str):
        self.log(f"→ {message}", Fore.YELLOW)
        
    def fetch_wikipedia(self, search_term: str) -> Optional[Dict]:
        """Wikipedia'dan içerik çek"""
        try:
            wiki_url = f"https://tr.wikipedia.org/wiki/{quote_plus(search_term.replace(' ', '_'))}"
            response = self.session.get(wiki_url, timeout=15)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                
                title = soup.find('h1', {'id': 'firstHeading'})
                title_text = title.get_text(strip=True) if title else search_term
                
                content_div = soup.find('div', {'id': 'mw-content-text'})
                content = ''
                if content_div:
                    paragraphs = content_div.find_all('p', limit=5)
                    content = ' '.join([p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)])
                    if len(content) > 1500:
                        content = content[:1500] + '...'
                        
                coords = self._extract_coordinates(soup)
                image = self._extract_main_image(soup)
                
                return {
                    'title': title_text,
                    'content': content,
                    'url': response.url,
                    'coordinates': coords,
                    'image': image,
                }
            return None
        except Exception as e:
            self.error(f"Wikipedia hatası: {str(e)[:50]}")
            return None
            
    def _extract_coordinates(self, soup: BeautifulSoup) -> Optional[Dict]:
        """Koordinat çıkar"""
        try:
            coord_span = soup.find('span', {'class': 'geo'})
            if coord_span:
                text = coord_span.get_text()
                parts = text.replace(',', '.').split(';')
                if len(parts) == 2:
                    return {'lat': float(parts[0].strip()), 'lon': float(parts[1].strip())}
            return None
        except:
            return None
            
    def _extract_main_image(self, soup: BeautifulSoup) -> Optional[str]:
        """Ana resmi çıkar"""
        try:
            infobox = soup.find('table', {'class': 'infobox'})
            if infobox:
                img = infobox.find('img')
                if img:
                    src = img.get('src', '')
                    if src.startswith('//'):
                        return 'https:' + src
                    elif src.startswith('/'):
                        return 'https://tr.wikipedia.org' + src
            return None
        except:
            return None
            
    def generate_description(self, name: str, wiki_content: str = '') -> str:
        """Açıklama oluştur"""
        templates = [
            f"{name}, Şanlıurfa'nın en popüler mekanlarından biridir. {wiki_content[:200] if wiki_content else 'Ziyaretçilerine eşsiz bir deneyim sunar.'}",
            f"Şanlıurfa'da {name} ziyaret edilecek yerler listesinin başında gelir. {wiki_content[:200] if wiki_content else 'Tarihi ve kültürel değerleriyle dikkat çeker.'}",
        ]
        import random
        return random.choice(templates)
        
    def fetch_category(self, category: str, items: List[Dict]) -> List[Dict]:
        """Kategori verisi çek"""
        self.log(f"\n{'='*60}", Fore.CYAN)
        self.log(f"KATEGORİ: {category.upper()} ({len(items)} mekan)", Fore.CYAN)
        self.log(f"{'='*60}\n", Fore.CYAN)
        
        results = []
        for i, item in enumerate(items, 1):
            self.info(f"[{i}/{len(items)}] {item['name']}")
            
            wiki_data = self.fetch_wikipedia(item['search'])
            time.sleep(0.8)
            
            if wiki_data:
                data = {
                    'id': str(uuid.uuid4()),
                    'slug': item['slug'],
                    'name': item['name'],
                    'category': category,
                    'wikipedia': wiki_data,
                    'description': self.generate_description(item['name'], wiki_data.get('content', '')),
                    'coordinates': wiki_data.get('coordinates'),
                    'image_url': wiki_data.get('image'),
                    'fetched_at': datetime.now().isoformat()
                }
                results.append(data)
                self.success(f"  ✓ {item['name']} tamamlandı")
            else:
                # Wikipedia'da bulunamazsa temel veri oluştur
                data = {
                    'id': str(uuid.uuid4()),
                    'slug': item['slug'],
                    'name': item['name'],
                    'category': category,
                    'description': f"{item['name']} Şanlıurfa'da popüler bir mekandır.",
                    'fetched_at': datetime.now().isoformat()
                }
                results.append(data)
                self.error(f"  ✗ {item['name']} Wikipedia'da bulunamadı, temel veri oluşturuldu")
                
        return results
        
    def save_data(self, data: List[Dict], filename: str):
        ""Veriyi kaydet"""
        filepath = self.data_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        self.success(f"Kaydedildi: {filepath}")
        
    def generate_sql(self, all_data: Dict[str, List[Dict]]):
        """SQL oluştur"""
        sql = []
        
        for category, items in all_data.items():
            for item in items:
                if category == 'tarihi_yerler':
                    coords = item.get('coordinates', {})
                    wiki = item.get('wikipedia', {})
                    sql.append(f"""INSERT INTO historical_sites (id, slug, name, title, description, latitude, longitude, cover_image, created_at) VALUES ('{str(uuid.uuid4())}', '{item['slug']}', '{item['name'].replace("'", "''")}', '{item['name'].replace("'", "''")}', '{item['description'][:300].replace("'", "''")}', {coords.get('lat', 37.1591)}, {coords.get('lon', 38.7969)}, '{item.get('image_url', f'/images/historical/{item[\"slug\"]}.jpg')}', NOW());""")
                    
                elif category == 'restoranlar':
                    sql.append(f"""INSERT INTO places (id, slug, name, description, category, address, rating, cover_image, created_at) VALUES ('{str(uuid.uuid4())}', '{item['slug']}', '{item['name'].replace("'", "''")}', '{item['description'][:300].replace("'", "''")}', 'restaurant', 'Şanlıurfa', 4.5, '{item.get('image_url', f'/images/places/{item[\"slug\"]}.jpg')}', NOW());""")
                    
                elif category == 'oteller':
                    sql.append(f"""INSERT INTO places (id, slug, name, description, category, address, rating, cover_image, created_at) VALUES ('{str(uuid.uuid4())}', '{item['slug']}', '{item['name'].replace("'", "''")}', '{item['description'][:300].replace("'", "''")}', 'hotel', 'Şanlıurfa', 4.3, '{item.get('image_url', f'/images/places/{item[\"slug\"]}.jpg')}', NOW());""")
                    
                elif category == 'kafeler':
                    sql.append(f"""INSERT INTO places (id, slug, name, description, category, address, rating, cover_image, created_at) VALUES ('{str(uuid.uuid4())}', '{item['slug']}', '{item['name'].replace("'", "''")}', '{item['description'][:300].replace("'", "''")}', 'cafe', 'Şanlıurfa', 4.4, '{item.get('image_url', f'/images/places/{item[\"slug\"]}.jpg')}', NOW());""")
                    
        sql_file = self.data_dir / "supabase_inserts.sql"
        with open(sql_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(sql))
        self.success(f"SQL oluşturuldu: {sql_file}")
        
    def run(self):
        """Ana çalıştırma"""
        self.log("""
╔══════════════════════════════════════════════════════════╗
║     ŞANLIURFA WEB SCRAPING AGENT v3.0 - API'siz         ║
╚══════════════════════════════════════════════════════════╝
        """, Fore.CYAN)
        
        all_data = {}
        total = sum(len(items) for items in self.categories.values())
        
        self.log(f"Toplam çekilecek mekan: {total}", Fore.YELLOW)
        self.log("Kaynaklar: Wikipedia, Wikimedia Commons", Fore.YELLOW)
        
        for category, items in self.categories.items():
            data = self.fetch_category(category, items)
            all_data[category] = data
            self.save_data(data, f"{category}.json")
            
        self.generate_sql(all_data)
        
        self.log("\n" + "="*60, Fore.GREEN)
        self.log("TÜM İŞLEMLER TAMAMLANDI!", Fore.GREEN)
        self.log("="*60, Fore.GREEN)
        self.log(f"\nToplam: {total} mekan", Fore.CYAN)
        self.log(f"Veriler: {self.data_dir}", Fore.CYAN)
        self.log(f"\nSonraki adım: Görsel çekme için run-all.bat çalıştırın", Fore.YELLOW)

if __name__ == "__main__":
    agent = WebScrapingAgent()
    agent.run()
