# Tower Defense-spill – Dokumentasjon

## Oversikt

Dette prosjektet er et 3D Tower Defense-spill laget med [Three.js](https://threejs.org) for rendering, med egendefinert logikk for spillmekanikk, ressursstyring og fiende-AI. Spillet har et sekskantet rutenettkart, ressursinnsamling, bygging, og en dag/natt-syklus som påvirker gameplay.

## Funksjoner

- **3D sekskantet rutenettkart:** Spillverdenen genereres som et stort sekskantet rutenett med 3D-modeller for ulike terrengtyper (gress, stein, osv.).
- **Ressurssystem:** Spilleren kan samle ressurser (tre, stein, diamant) ved å klikke på objekter i verdenen.
- **Byggesystem:** Spilleren kan plassere bygninger (slott, murer, tårn) på rutenettet via en hotbar, så lenge de har nok ressurser.
- **Dag/natt-syklus:** Spillet veksler mellom dag og natt. Fiender dukker opp og angriper om natten, mens bygging og ressursinnsamling kun er tillatt på dagtid.
- **Fiende-AI:** Fiender spawner om natten og beveger seg mot nærmeste bygning for å angripe og ødelegge dem hvis de ikke stoppes.
- **UI-elementer:** Viser ressursbeholdning, hotbar for byggvalg, verktøytips, popup for manglende ressurser og game over-skjerm.
- **Stilisert grafikk:** Bruker egendefinerte modeller og teksturer, med uskarp bakgrunn og glødeeffekter på fiender og UI.

## Hvordan spillet ble laget

### 1. Planlegging og design

- **Konsept:** Målet var å lage et enkelt, men visuelt tiltalende tower defense-spill med fokus på ressursstyring og strategisk bygging.
- **Design:** Jeg tegnet opp UI-layout, spillflyt (hovedmeny, spill, kreditering) og kjernemekanikker (ressursinnsamling, bygging, fiendebølger).

### 2. Oppsett av prosjektet

- **Mappestruktur:** Organiserte filer, skript og HTML for oversiktlighet.
- **Three.js-integrasjon:** La til Three.js og støttelibs (GLTFLoader, OrbitControls) via CDN i [game.html](game.html).

### 3. Bygging av spillverden

- **Sekskantet rutenett:** Lagde funksjon for å generere sekskantede ruter med tilfeldig terreng ([`generateHexGrid`](game.js)).
- **Modellinnlasting:** Lastet inn 3D-modeller for ruter og objekter (trær, steiner, diamanter) med GLTFLoader ([`modelPaths`](game.js), [`objectPaths`](game.js)).
- **Vannflate:** La til et halvgjennomsiktig vannplan under rutenettet for visuell effekt ([`addWaterPlane`](game.js)).

### 4. Ressurser og objektplassering

- **Ressursobjekter:** Plasserte trær, steiner og diamanter tilfeldig på passende ruter ([`placeObjectsOnGrid`](game.js)).
- **Ressursinnsamling:** Implementerte klikkdeteksjon slik at spilleren kan samle ressurser ved å klikke på objekter ([`window.addEventListener('mousedown', ...)`](game.js)).

### 5. UI og brukerinteraksjon

- **Ressursvisning:** Viser nåværende ressurser øverst til venstre ([game.html](game.html)).
- **Hotbar:** Spilleren kan velge hvilken bygning som skal plasseres, med verktøytips som viser kostnader ([game.html](game.html), [`parseCost`](game.js)).
- **Byggeplassering:** Håndterer valg, rotasjon (Q/E-taster) og plassering av bygninger hvis spilleren har nok ressurser ([`window.addEventListener('mousedown', ...)`](game.js)).
- **Popups og overlays:** Viser popup for manglende ressurser og game over-skjerm når alle slott er ødelagt ([`showNotEnoughResourcesPopup`](game.js), [`showEndGameScreen`](game.js)).

### 6. Dag/natt-syklus og fiendelogikk

- **Sykluslogikk:** Veksler mellom dag og natt med timere og fargeoverganger ([`toggleDayNight`](game.js), [`transitionDayNight`](game.js)).
- **Fiendespawning:** Fiender dukker opp på tilfeldige posisjoner om natten ([`spawnEnemy`](game.js)).
- **Fiendebevegelse og angrep:** Fiender søker nærmeste bygning og angriper, reduserer helse og ødelegger bygninger hvis de ikke forsvares ([`moveEnemyTowardBuilding`](game.js), [`attackBuilding`](game.js)).

### 7. Menyer og navigasjon

- **Hovedmeny:** Start nytt spill, vis alternativer (kommer), og kreditering ([index.html](index.html)).
- **Krediteringsside:** Viser bidragsytere og kilder ([credits.html](credits.html)).
- **Tilbake til meny:** Knappe i spillet for å gå tilbake til hovedmenyen ([`returnToMenuButton`](game.js)).

### 8. Visuell og brukeropplevelse

- **Stil:** Brukte [style.css](style.css) for moderne spillutseende med gradienter, uskarphet og responsivt design.
- **Tilbakemelding:** La til visuell tilbakemelding for valgt hotbar-knapp, verktøytips og interaktive popups.

## Prosessen

1. **Første oppsett:** Lagde grunnleggende HTML-struktur og integrerte Three.js.
2. **Kartgenerering:** Utviklet sekskantlogikk og lastet inn terrengmodeller.
3. **Ressurssystem:** Implementerte objektplassering og ressursinnsamling.
4. **UI-utvikling:** Bygde ressursvisning, hotbar, verktøytips og popups.
5. **Byggesystem:** La til logikk for valg, rotasjon og plassering av bygninger.
6. **Fiende-AI:** Programmerte spawning, bevegelse og angrepslogikk for fiender.
7. **Spill-løkke:** Kombinerte alle elementer i hovedløkken.
8. **Polering:** Forbedret grafikk, la til lyd/tilbakemelding og testet gameplay.
9. **Dokumentasjon:** Skrev denne README og kreditering.

## Teknologier brukt

- [Three.js](https://threejs.org) – 3D-grafikk
- HTML/CSS/JavaScript – Kjernewebteknologier
- Egendefinerte 3D-modeller (GLB-format)
- [BlenderKit](https://www.blenderkit.com) – Teksturer

## Kreditering

Se [credits.html](credits.html) for fullstendig liste over bidragsytere og kilder.

---

**Laget av Jonatan / GitHub Copilot**