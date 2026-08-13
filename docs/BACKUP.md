# Automatyczne kopie SplitTrack

## Co wykonuje backup

Mechanizm zabezpiecza dwa niezależne rodzaje danych SplitTrack:

1. Bazę PostgreSQL, w której znajdują się między innymi wydatki, rozliczenia, projekty oraz odwołania do zdjęć.
2. Fizyczne pliki zdjęć zapisane przez backend w `/app/uploads` w kontenerze `splittrack-backend`.

Dump bazy nie zawiera plików zdjęć. Z tego powodu baza jest kopiowana codziennie, a zdjęcia mają osobny, cotygodniowy snapshot.

## Kiedy wykonywane są kopie

- Codziennie o północy powstaje kopia bazy danych.
- W niedzielę o północy, oprócz bazy, powstaje pełna kopia wszystkich zdjęć.
- Skrypt nie pracuje bez przerwy. Uruchamia się tylko na czas wykonania kopii, a następnie kończy działanie.

Godzinę uruchomienia kontroluje systemd, a nie aplikacja SplitTrack ani Docker. Backup jest więc niezależny od uruchamiania frontendu i backendu.

## Jak współpracują elementy mechanizmu

Przepływ wygląda następująco:

```text
systemd użytkownika maciek
        │
        │ codziennie o 00:00
        ▼
splittrack-backup.timer
        │
        │ uruchamia jednorazową usługę
        ▼
splittrack-backup.service
        │
        │ uruchamia skrypt
        ▼
scripts/backup-splittrack.sh
        │
        ├── zawsze: kopia i kontrola bazy PostgreSQL
        ├── niedziela: kopia i kontrola wszystkich zdjęć
        └── zapis wyniku w backup.log, po czym skrypt się wyłącza
```

Poszczególne pliki mają następujące role:

- `deploy/systemd/splittrack-backup.timer` określa termin uruchamiania: `OnCalendar=*-*-* 00:00:00`.
- `deploy/systemd/splittrack-backup.service` wskazuje skrypt, który systemd ma uruchomić.
- `scripts/backup-splittrack.sh` wykonuje właściwą kopię oraz jej kontrolę.
- Kopie jednostek `service` i `timer` używane przez system znajdują się w `/home/maciek/.config/systemd/user/`.

Timer jest użytkownikowy, czyli działa jako użytkownik `maciek`, bez uprawnień administratora. Dla tego konta włączony jest systemd linger, dlatego timer może działać również wtedy, gdy użytkownik nie jest zalogowany w sesji graficznej lub terminalu.

## Przebieg pojedynczego backupu

Po uruchomieniu skrypt wykonuje kolejno następujące działania:

1. Ustawia prywatne uprawnienia dla nowych plików (`umask 077`).
2. Otwiera plik blokady `.backup.lock`. Jeśli poprzedni backup nadal trwa, nowe uruchomienie zostaje bezpiecznie pominięte.
3. Pobiera lokalną datę systemową i tworzy katalog roku, miesiąca i dnia.
4. Sprawdza, czy kontener bazy `db` działa.
5. Uruchamia `pg_dump` wewnątrz kontenera PostgreSQL i zapisuje bazę w formacie custom (`-Fc`) do pliku tymczasowego.
6. Sprawdza, czy plik nie jest pusty, a następnie odczytuje jego strukturę przez `pg_restore -l`.
7. Dopiero po pomyślnej kontroli zmienia nazwę pliku tymczasowego na docelową. Niekompletny dump nie powinien więc wyglądać jak gotowa kopia.
8. Tworzy plik `.sha256`, który pozwala później wykryć uszkodzenie lub zmianę dumpa.
9. Sprawdza dzień tygodnia. W zwykły dzień kończy pracę po wykonaniu kopii bazy.
10. Jeżeli jest niedziela, sprawdza kontener `splittrack-backend` i kopiuje całą zawartość `/app/uploads` do tymczasowego katalogu zdjęć.
11. Porównuje liczbę plików źródłowych i skopiowanych. Jeśli liczby się różnią, kopia zdjęć nie zostaje uznana za gotową.
12. Tworzy `MANIFEST.sha256` z sumami wszystkich zdjęć i dopiero wtedy przenosi katalog tymczasowy pod docelową nazwę.
13. Zapisuje rezultat w logu i kończy działanie.

Skrypt nie usuwa automatycznie starszych backupów ani oryginalnych danych aplikacji.

## Gdzie znajdują się kopie

Główny katalog:

```text
/home/maciek/Kopia Baz Danych/Splitrack
```

Katalog dnia ma strukturę:

```text
/home/maciek/Kopia Baz Danych/Splitrack/<rok>/<miesiac>/<dzien>/
```

Przykład:

```text
/home/maciek/Kopia Baz Danych/Splitrack/2026/sierpien/16/
├── splittrack-baza-2026-08-16-000001.dump
├── splittrack-baza-2026-08-16-000001.dump.sha256
└── zdjecia/
    ├── pliki zdjęć...
    └── MANIFEST.sha256
```

Nazwy miesięcy są zapisywane bez polskich znaków, np. `sierpien`, `wrzesien` i `pazdziernik`.

Jeśli backup zostanie ręcznie uruchomiony więcej niż raz tego samego dnia, powstaną osobne dumpy z różnymi godzinami. Jeżeli tego samego dnia istnieje już katalog `zdjecia`, następny snapshot otrzyma nazwę zawierającą godzinę, np. `zdjecia-143012`. Istniejąca kopia nie jest nadpisywana.

## Co musi działać

Do codziennej kopii bazy wymagane są:

- uruchomiony Docker,
- działający kontener usługi `db`,
- dostęp użytkownika `maciek` do Dockera,
- dostęp do katalogu projektu oraz katalogu docelowego.

Do niedzielnej kopii zdjęć dodatkowo musi działać kontener `splittrack-backend`, ponieważ katalog `/app/uploads` jest zamontowany właśnie w nim.

Frontend nie musi działać. Jeżeli wymagany kontener jest wyłączony, skrypt kończy się błędem, zapisuje informację w logu i nie oznacza niepełnej kopii jako poprawnej.

## Co się dzieje po wyłączeniu komputera

Timer ma ustawienie:

```ini
Persistent=true
```

Jeżeli komputer był wyłączony dokładnie o północy, systemd uruchomi zaległą usługę po ponownym uruchomieniu systemu. Katalog i nazwa kopii będą wtedy odpowiadały rzeczywistej dacie wykonania, a nie dacie pominiętego terminu.

Ważne: decyzja o kopiowaniu zdjęć jest podejmowana na podstawie dnia, w którym skrypt faktycznie się uruchomił. Jeśli komputer był wyłączony w niedzielę i został uruchomiony dopiero w poniedziałek, zaległa kopia bazy zostanie wykonana, ale zdjęcia zostaną pominięte, ponieważ w chwili wykonania jest już poniedziałek. Pełny automatyczny snapshot zdjęć nastąpi w następną niedzielę. W razie potrzeby można wcześniej uruchomić go ręcznie z opcją `--with-photos`.

## Sprawdzanie harmonogramu

Stan timera:

```bash
systemctl --user status splittrack-backup.timer
```

Następny termin uruchomienia:

```bash
systemctl --user list-timers splittrack-backup.timer --all
```

Prawidłowo skonfigurowany timer powinien mieć stan `active (waiting)` i pokazywać kolejny termin o północy.

## Ręczne uruchamianie

Uruchomienie dokładnie tak, jak zrobi to timer — baza zawsze, zdjęcia tylko w niedzielę:

```bash
systemctl --user start splittrack-backup.service
```

Kopia samej bazy, niezależnie od dnia tygodnia:

```bash
./scripts/backup-splittrack.sh --database-only
```

Kopia bazy oraz zdjęć, niezależnie od dnia tygodnia:

```bash
./scripts/backup-splittrack.sh --with-photos
```

Polecenia należy wykonywać z katalogu projektu:

```text
/home/maciek/Hostowane projekty/SplitTrack
```

## Logi i diagnozowanie błędów

Pełny dziennik kolejnych uruchomień jest dopisywany do:

```text
/home/maciek/Kopia Baz Danych/Splitrack/backup.log
```

Log ostatnich uruchomień zapisany przez systemd można sprawdzić poleceniem:

```bash
journalctl --user -u splittrack-backup.service
```

Ostatni wynik usługi:

```bash
systemctl --user status splittrack-backup.service
```

Usługa typu `oneshot` po poprawnym wykonaniu ma stan `inactive (dead)` oraz wynik `status=0/SUCCESS`. Stan `inactive` nie oznacza w tym przypadku problemu — skrypt miał wykonać zadanie i się zakończyć. Błąd jest oznaczony jako `failed` oraz opisany w logach.

## Ręczna kontrola integralności

Sprawdzenie pojedynczego dumpa na podstawie sumy SHA-256:

```bash
sha256sum -c splittrack-baza-2026-08-16-000001.dump.sha256
```

Sprawdzenie wszystkich zdjęć w danym snapshotcie:

```bash
cd zdjecia
sha256sum -c MANIFEST.sha256
```

Wynik `OK` oznacza, że plik ma taką samą zawartość jak w chwili tworzenia manifestu. Suma SHA-256 kontroluje integralność, ale nie zastępuje przechowywania dodatkowej kopii na innym fizycznym nośniku.

## Włączanie i wyłączanie automatyzacji

Wyłączenie kolejnych automatycznych uruchomień:

```bash
systemctl --user disable --now splittrack-backup.timer
```

Ponowne włączenie:

```bash
systemctl --user enable --now splittrack-backup.timer
```

Po zmianie plików jednostek w repozytorium trzeba ponownie skopiować je do `/home/maciek/.config/systemd/user/`, wykonać `systemctl --user daemon-reload` i zrestartować timer. Samo edytowanie kopii w `deploy/systemd` nie zmienia automatycznie już zainstalowanej konfiguracji systemd.

## Odtwarzanie danych

Plik `.dump` jest przeznaczony do odtworzenia narzędziem `pg_restore`. Przywrócenie bazy może nadpisać aktualne dane, dlatego nie jest wykonywane automatycznie i powinno być poprzedzone dodatkową kopią aktualnego stanu.

Zdjęcia odtwarza się osobno do wolumenu używanego jako `/app/uploads`. Baza i zdjęcia powinny pochodzić z możliwie zbliżonego terminu, aby odwołania zapisane w bazie odpowiadały istniejącym plikom.
