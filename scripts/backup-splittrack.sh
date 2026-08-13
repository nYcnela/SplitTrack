#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

readonly BACKUP_ROOT="${SPLITTRACK_BACKUP_ROOT:-/home/maciek/Kopia Baz Danych/Splitrack}"
readonly PROJECT_DIR="${SPLITTRACK_PROJECT_DIR:-/home/maciek/Hostowane projekty/SplitTrack}"
readonly BACKEND_CONTAINER="${SPLITTRACK_BACKEND_CONTAINER:-splittrack-backend}"

force_photos=false
database_only=false

for argument in "$@"; do
    case "$argument" in
        --with-photos) force_photos=true ;;
        --database-only) database_only=true ;;
        *)
            printf 'Nieznany argument: %s\n' "$argument" >&2
            exit 2
            ;;
    esac
done

mkdir -p "$BACKUP_ROOT"
readonly LOG_FILE="$BACKUP_ROOT/backup.log"
exec > >(tee -a "$LOG_FILE") 2>&1

log() {
    printf '[%s] %s\n' "$(date '+%F %T %Z')" "$*"
}

on_error() {
    local exit_code=$?
    log "BŁĄD: backup nie został ukończony (kod $exit_code, linia ${BASH_LINENO[0]})."
    exit "$exit_code"
}
trap on_error ERR

exec 9>"$BACKUP_ROOT/.backup.lock"
if ! flock -n 9; then
    log "Pominięto uruchomienie: inny backup jest nadal wykonywany."
    exit 0
fi

month_name() {
    case "$1" in
        01) printf 'styczen' ;;
        02) printf 'luty' ;;
        03) printf 'marzec' ;;
        04) printf 'kwiecien' ;;
        05) printf 'maj' ;;
        06) printf 'czerwiec' ;;
        07) printf 'lipiec' ;;
        08) printf 'sierpien' ;;
        09) printf 'wrzesien' ;;
        10) printf 'pazdziernik' ;;
        11) printf 'listopad' ;;
        12) printf 'grudzien' ;;
        *) return 1 ;;
    esac
}

readonly run_date="$(date '+%F')"
readonly run_time="$(date '+%H%M%S')"
readonly year="$(date '+%Y')"
readonly month="$(month_name "$(date '+%m')")"
readonly day="$(date '+%d')"
readonly weekday="$(date '+%u')"
readonly day_dir="$BACKUP_ROOT/$year/$month/$day"

mkdir -p "$day_dir"
cd "$PROJECT_DIR"

if ! docker compose ps --status running --services | grep -qx 'db'; then
    log "BŁĄD: kontener bazy danych SplitTrack nie jest uruchomiony."
    exit 1
fi

database_target="$day_dir/splittrack-baza-$run_date-$run_time.dump"
database_temp="$(mktemp "$day_dir/.splittrack-baza.XXXXXX.dump")"

cleanup() {
    if [[ -n "${database_temp:-}" && -e "$database_temp" ]]; then
        rm -f -- "$database_temp"
    fi
    if [[ -n "${photos_temp:-}" && -d "$photos_temp" ]]; then
        rm -rf -- "$photos_temp"
    fi
    return 0
}
trap cleanup EXIT

log "Rozpoczynam kopię bazy danych do: $database_target"
docker compose exec -T db sh -lc 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$database_temp"
test -s "$database_temp"
docker compose exec -T db sh -lc 'pg_restore -l' < "$database_temp" > /dev/null
mv -- "$database_temp" "$database_target"
database_temp=""
sha256sum "$database_target" > "$database_target.sha256"
log "Kopia bazy gotowa ($(du -h "$database_target" | cut -f1)); struktura archiwum jest prawidłowa."

copy_photos=false
if [[ "$database_only" == false && ( "$force_photos" == true || "$weekday" == "7" ) ]]; then
    copy_photos=true
fi

if [[ "$copy_photos" == true ]]; then
    if ! docker inspect -f '{{.State.Running}}' "$BACKEND_CONTAINER" 2>/dev/null | grep -qx 'true'; then
        log "BŁĄD: kontener backendu SplitTrack nie jest uruchomiony."
        exit 1
    fi

    photos_target="$day_dir/zdjecia"
    if [[ -e "$photos_target" ]]; then
        photos_target="$day_dir/zdjecia-$run_time"
    fi
    photos_temp="$(mktemp -d "$day_dir/.zdjecia.XXXXXX")"

    log "Rozpoczynam pełną kopię zdjęć do: $photos_target"
    docker cp "$BACKEND_CONTAINER:/app/uploads/." "$photos_temp/"
    source_count="$(docker exec "$BACKEND_CONTAINER" sh -lc 'find /app/uploads -type f | wc -l')"
    copied_count="$(find "$photos_temp" -type f | wc -l)"
    if [[ "$source_count" != "$copied_count" ]]; then
        log "BŁĄD: liczba zdjęć się nie zgadza (źródło: $source_count, kopia: $copied_count)."
        exit 1
    fi
    (
        cd "$photos_temp"
        find . -type f ! -name 'MANIFEST.sha256' -print0 | sort -z | xargs -0 sha256sum > MANIFEST.sha256
    )
    mv -- "$photos_temp" "$photos_target"
    photos_temp=""
    log "Kopia zdjęć gotowa ($copied_count plików, $(du -sh "$photos_target" | cut -f1))."
else
    log "Kopia zdjęć pominięta — pełna kopia jest wykonywana w niedziele."
fi

log "Backup SplitTrack zakończony pomyślnie."
