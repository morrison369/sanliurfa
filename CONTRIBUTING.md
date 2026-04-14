# 🤝 Katkıda Bulunma Kılavuzu

Şanlıurfa.com projesine katkıda bulunmak için teşekkürler!

## 🚀 Başlangıç

1. Depoyu fork edin
2. Kendi branch'inizi oluşturun: `git checkout -b feature/yeni-ozellik`
3. Değişikliklerinizi yapın
4. Commit edin: `git commit -m 'feat: Yeni özellik eklendi'`
5. Push edin: `git push origin feature/yeni-ozellik`
6. Pull Request açın

## 📋 Geliştirme Akışı

### Branch İsimlendirme

- `feature/` - Yeni özellikler
- `fix/` - Hata düzeltmeleri
- `docs/` - Dokümantasyon
- `refactor/` - Kod iyileştirmeleri
- `test/` - Test ekleme/düzeltme

### Commit Mesajları

Conventional Commits formatını kullanın:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Tipler:**
- `feat:` Yeni özellik
- `fix:` Hata düzeltmesi
- `docs:` Dokümantasyon değişikliği
- `style:` Kod formatı (boşluk, virgül vs.)
- `refactor:` Kod refactor
- `test:` Test ekleme/düzeltme
- `chore:` Build, config değişiklikleri

### Örnekler

```
feat(auth): JWT token yenileme eklendi

Kullanıcı token'ı süresi dolmadan önce otomatik olarak
yenileniyor. Bu sayede kullanıcı deneyimi iyileştirildi.

Closes #123
```

## 🧪 Test

Tüm değişiklikleriniz için test yazmalısınız:

```bash
# Unit testler
npm run test:unit

# E2E testler
npm run test:e2e

# Tüm testler
npm run test
```

## 📊 Code Quality

```bash
# Lint kontrolü
npm run lint

# Format kontrolü
npm run format
```

## 🔒 Güvenlik

- Hassas verileri asla commit etmeyin
- `.env` dosyasını kontrol edin
- Güvenlik açıklarını özel olarak bildirin

## 📞 İletişim

- Sorular için: [Discussions](https://github.com/sanliurfa/sanliurfa.com/discussions)
- Hata bildirimi: [Issues](https://github.com/sanliurfa/sanliurfa.com/issues)

---

Katkılarınız için teşekkürler! 🎉
