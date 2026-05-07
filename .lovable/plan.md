
## Importera music-core via GitHub

### Steg 1 — Koppla detta Lovable-projekt till GitHub
1. Öppna **Connectors** (i sidomenyn) → GitHub → **Connect project**
2. Auktorisera Lovable GitHub App om du inte redan gjort det
3. Välj ditt GitHub-konto/organisation
4. Klicka **Create Repository** — ett nytt repo skapas med den nuvarande (tomma) koden

### Steg 2 — Ersätt koden med music-core
Lokalt på din dator:

```bash
# Klona det nya Lovable-repot
git clone https://github.com/DITT-KONTO/NYTT-REPO.git
cd NYTT-REPO

# Kopiera in alla filer från music-core (utom .git)
# Alternativ A: om music-core finns lokalt
cp -r ../music-core/* .
cp -r ../music-core/.* . 2>/dev/null

# Alternativ B: om du bara har det på GitHub
git remote add music https://github.com/DITT-KONTO/music-core.git
git fetch music
git checkout music/main -- .

# Pusha till Lovable-repot
git add .
git commit -m "Import music-core"
git push origin main
```

### Steg 3 — Synkas automatiskt
När du pushar synkas koden automatiskt hit till Lovable. Sedan fortsätter vi jobba med den här.

### Viktigt att tänka på
- Lovable använder **TanStack Start** (React + Vite). Om music-core har en annan struktur (t.ex. Next.js, vanilla React) kan vi behöva anpassa den.
- Berätta gärna vilken tech-stack music-core använder så kan jag hjälpa till med eventuell anpassning efter importen.
