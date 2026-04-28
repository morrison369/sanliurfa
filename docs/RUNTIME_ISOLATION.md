# Runtime Isolation

- Global Redis portu `6379` proje gate'lerinde kullanilmaz.
- Ana worktree Redis portu `6381` kabul edilir.
- `public-worktree-sync` Redis portu `6382` kabul edilir.
- Diger worktree'ler deterministik proje portu kullanir.
- `social:core:gate:strict` sonunda dev server ve Redis kapatilir.
- `dev:isolated:stop:all` local cleanup icin standart komuttur.
