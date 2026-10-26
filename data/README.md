# data/

- `raw/` — heruntergeladener IKEA-Datensatz (gitignored). Download siehe unten.
- `catalog.json` — generierter, aufbereiteter Katalog (gitignored, von `scripts/prepare_catalog.py` erzeugt).

## IKEA-Datensatz herunterladen (einmalig)

```bash
pip install "huggingface_hub[cli]"
hf download jeffreyszhou/ikea-us-products-2025 products-us.jsonl \
  --repo-type dataset --local-dir data/raw
```

Details zur Quelle, Lizenz-Hinweis und Währungs-Handling: **docs/DATA-SOURCES.md**.
