# 👑 Clash Royale Meta Finder - Project Context

## 🎯 Obiettivo Centrale
L'obiettivo principale di questa applicazione è **aiutare i giocatori di Clash Royale a trovare i migliori mazzi del meta attuale (Top 200 Pro) che si adattano perfettamente alla loro collezione di carte**. 
L'app incrocia i dati dei log di battaglia dei giocatori professionisti con i livelli delle carte, le evoluzioni e gli eroi sbloccati dall'utente, calcolando un punteggio di "Affinità" per suggerire i deck più performanti e immediatamente utilizzabili.

---

## 🏗️ Architettura e Stack Tecnologico
* **Frontend**: React (Vite) + TypeScript.
* **Stile**: CSS puro con variabili CSS per un tema scuro "Premium" (`App.css`).
* **Dati**: RoyaleAPI (tramite proxy/integrazione diretta in `royaleApi.ts`).
* **Icone**: `lucide-react`.

---

## 🧠 Logiche di Core Business (DA NON ROMPERE)

### 1. Sistema di Analisi Meta e Scoring (`DeckBuilder.tsx` / `App.tsx`)
L'algoritmo di raccomandazione dei mazzi non è casuale. Scansiona i giocatori in Top Ladder / Path of Legend, estrae i mazzi dai loro *Battle Logs* e li valuta in base alla collezione dell'utente.
La formula di scoring calcola:
* **Base (+)**: Livello totale delle carte possedute (`Livello * 10`).
* **Bonus Elite (+)**: Carte maxate a livello 16 (`Elite * 25`).
* **Penalità Proprietà (-)**: Carte mancanti dal mazzo (`Mancanti * 150`).
* **Penalità Requisiti Speciali (-)**: Evoluzioni o Eroi richiesti dal deck meta ma non sbloccati dall'utente (`Mancanti * 100`).
* **Bonus Meta (+)**: Frequenza di utilizzo del deck tra i pro (`Conteggio * 2`, max 50).

### 2. Rilevamento Dinamico delle Carte (`clashRoyale.ts`)
**REGOLA D'ORO:** Non utilizzare mai liste hardcoded (es. array di ID o nomi) per determinare se una carta è un'Evoluzione, un Campione o un Eroe (Hero).
* Il progetto utilizza un **rilevamento dinamico** basato sui payload dell'API:
    * **Evoluzioni**: Controlla la presenza di `iconUrls.evolutionMedium`, `evolutionLevel` o la stringa 'evo' nel nome.
    * **Campioni/Eroi**: Controlla la `rarity` ('champion', 'hero'), `iconUrls.heroMedium` o `heroLevel`.

### 3. Calcolo del Livello Reale
L'API restituisce il livello della carta partendo da 1 indipendentemente dalla rarità. L'app normalizza il livello di visualizzazione tramite la funzione `getDisplayLevel` sommando un `baseLevel` (Comune = 1, Rara = 3, Epica = 6, Leggendaria = 9, Campione/Eroe = 11).

---

## 🎨 Linee Guida per lo Stile e la UI (`App.css`)
* **Tema Premium**: L'interfaccia deve mantenere il suo aspetto scuro (background `#0f172a`, surface `#1e293b`), con sfumature (gradients) e ombre (box-shadow) per dare un senso di profondità.
* **Feedback Visivo**: Pulsanti e card devono avere transizioni morbide (`transition: all 0.2s`). Usa i badge per indicare lo status (maxed, missing levels, evolutions).
* **Evitare il disordine**: Mantenere il design pulito. Le funzionalità complesse (come i filtri in `DeckBuilder.tsx`) devono essere collassabili o animate (`filter-animation-wrapper`).

---

## 🤖 Istruzioni Operative per il Gemini CLI
Quando intervieni su questo progetto:
1.  **Preserva l'algoritmo di Affinity**: Se modifichi il fetching dei deck meta, assicurati che la logica di calcolo dello `score` non venga alterata senza esplicita richiesta.
2.  **Usa TypeScript Rigorosamente**: Dichiara sempre le interfacce per le risposte API e i props dei componenti. Nessun `any` se non strettamente necessario (come per i payload API non documentati).
3.  **Mantieni l'astrazione API**: Qualsiasi nuova chiamata verso RoyaleAPI deve essere aggiunta in `services/royaleApi.ts` e non direttamente nei componenti.
4.  **Generazione Deck Link**: La funzione `handleCopyDeck` genera URL `link.clashroyale.com`. Non rompere la logica di allocazione degli slot (Evos/Heroes hanno slot specifici nell'URL).