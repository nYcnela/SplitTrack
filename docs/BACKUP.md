# Automatyczne kopie SplitTrack

Timer użytkownika `splittrack-backup.timer` uruchamia skrypt codziennie o północy według lokalnej strefy czasowej systemu.

Kopie trafiają do:

```text
/home/maciek/Kopia Baz Danych/Splitrack/<rok>/<miesiac>/<dzien>/
```

Każdego dnia powstaje zweryfikowany dump PostgreSQL w formacie custom wraz z sumą SHA-256. W niedzielę dodatkowo powstaje katalog `zdjecia` z pełnym snapshotem `/app/uploads` i manifestem SHA-256 wszystkich plików.

Ręczne uruchomienie zgodnie z harmonogramem:

```bash
systemctl --user start splittrack-backup.service
```

Ręczny backup bazy i zdjęć niezależnie od dnia tygodnia:

```bash
./scripts/backup-splittrack.sh --with-photos
```

Status i logi:

```bash
systemctl --user status splittrack-backup.timer
journalctl --user -u splittrack-backup.service
```

Pełny dziennik kolejnych uruchomień znajduje się również w pliku `backup.log` w głównym katalogu kopii.
