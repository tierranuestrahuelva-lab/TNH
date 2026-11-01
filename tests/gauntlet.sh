#!/usr/bin/env bash
# Gauntlet: sirve la app, pasa las pruebas de uso (e2e) y el árbitro. Sale 0 solo si se cumple el listón.
set -u; cd "$(dirname "$0")/.."
python3 -m http.server 8777 --bind 127.0.0.1 >/dev/null 2>&1 & S=$!; trap 'kill $S' EXIT; sleep 1
U=http://127.0.0.1:8777/; ok=0
python3 tests/e2e.py "$U" | tail -n 40 || ok=1
python3 tests/arbitro.py "$U" | grep -v '^OK   buscar' || ok=1
[ $ok = 0 ] && echo "LISTÓN CUMPLIDO" || echo "LISTÓN NO CUMPLIDO"; exit $ok
