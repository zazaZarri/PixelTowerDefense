# PIXEL TOWER DEFENSE

Tower defense 2D in pixel art con **editor dei personaggi**.
Nessuna installazione: apri `index.html` con Chrome, Edge o Firefox.

## Come si gioca
- Scegli lo **stage**: PRATO (facile, 10 ondate), FORESTA (medio, 15), VULCANO (difficile, 20). Superi l'ultima ondata (con boss) = vittoria, fino a 3 stelle.
- Hai 20 secondi per piazzare le truppe, poi le ondate partono da sole. **▶ ONDATA** (o `SPAZIO`) le chiama prima e dà oro bonus.
- Dall'ondata 3 alcune ondate hanno un modificatore: VELOCI, CORAZZATI, SCIAME, GIGANTI.
- **Casse del codice** 📦: dal pannello **CASSE DEL CODICE** ne apri quante vuoi (e dopo le ondate dispari ne compare una anche sulla mappa). Metti in ordine i blocchi stile Scratch per aprirla: sblocchi una truppa segreta (le truppe bloccate non si vedono), o +40 oro quando le hai tutte: una slot con i personaggi gira, si ferma su "?" e rivela la ricompensa. Sfide semplicissime (max 4 blocchi): la prima è una **sequenza** facile (apri la cassa), tutte le altre sono **numeri** (parti da numero = X e metti in fila 3-4 operazioni + − × per arrivare al numero del lucchetto, scartando 1-2 blocchi trappola; vale ogni ordine che ci arriva). Puzzle in `js/chest.js`.
- Scegli un personaggio a destra (o premi `1`–`9`) e clicca su una casella d'erba per piazzarlo. Se i nemici arrivano al castello perdi vite.
- Clicca su una torre per vedere le statistiche, potenziarla (`U`), venderla (`CANC`) o cambiare il bersaglio (primo / ultimo / più forte / più vicino).
- `x1/x2/x3` cambia la velocità, `AUTO` fa partire le ondate da sole, `P` mette in pausa.
- Ogni 10 ondate arriva il **BOSS**.

## Creare un personaggio
Premi **+ CREA PERSONAGGIO** oppure ✎ su un personaggio esistente. Si apre l'editor:

1. **Codice**: scrivi le specifiche come variabili JavaScript, per esempio:
   ```js
   var name = "Ninja";
   var cost = 90;
   var damage = 6;
   var firerate = 4;        // colpi al secondo
   var range = 80;          // 16 px = 1 casella
   var projectile = "arrow";
   var shotCount = 3;       // tre frecce a ventaglio
   var spread = 15;
   var critChance = 0.25;
   ```
   Puoi usare anche dei calcoli (`var damage = 4 * 3;`). Gli errori compaiono subito sotto il codice.
   L'elenco cliccabile delle variabili disponibili è sotto l'editor.

2. **Sprite 16×16**: disegnalo con la matita (tasto destro = gomma), il secchiello, il contagocce, lo specchio e l'annulla (`CTRL+Z`).
   **AUTO** rigenera lo sprite dal `color` e dal tipo di `projectile`. Finché non disegni nulla, lo sprite si aggiorna da solo.
   Le ultime 4 righe sono la base: resta ferma mentre il personaggio "respira".

3. **Anteprima live**: vedi il personaggio sparare a dei bersagli finti, con DPS e raggio.

4. **SALVA** (`CTRL+S`). I personaggi vengono salvati nel browser. Con **ESPORTA/IMPORTA** salvi o carichi personaggi e armi da un file `.json`; ↺ ripristina quelli di default.

### Tipi di proiettile
| projectile | effetto |
|---|---|
| `arrow` | freccia veloce, con `pierce` attraversa più nemici |
| `fireball` | palla di fuoco con scia, esplode se `splash` > 0 |
| `ice` | rallenta (`slow`, `slowTime`) con schegge di ghiaccio |
| `lightning` | fulmine istantaneo che rimbalza tra `chain` nemici |
| `bomb` | bomba ad arco, esplosione grande con scossa dello schermo |
| `laser` | raggio istantaneo, con `pierce` trapassa i nemici in linea |

## Armi personalizzate
Nella sezione **ARMI** clicca un'arma per modificarla oppure **+ CREA ARMA**. Nell'editor delle armi puoi:
- **disegnare il colpo** pixel per pixel (da 8×8 a 64×64), con qualsiasi colore (selettore colore libero);
- **caricare un'immagine** (📁 CARICA IMMAGINE, oppure trascinala sulla griglia o incollala con `CTRL+V`): viene ritagliata e trasformata in pixel. Puoi ritoccarla e aggiungere il **CONTORNO**;
- scegliere con il codice **grandezza** (`size`), **movimento** (`motion`: homing, straight, wave, boomerang, lob, rain), rotazione (`spin`, `rotate`), **scia** (`trail`), **effetto all'impatto** (`hitEffect`), alone luminoso, scossa dello schermo e **suoni** di sparo e di impatto;
- vedere l'anteprima live con qualsiasi personaggio.

Per far usare un'arma a un personaggio, nel suo codice scrivi `var weapon = "Shuriken";` oppure clicca l'arma nella riga **ARMA:** dell'editor del personaggio.
Danno, cadenza, area, rallentamento e numero di colpi restano del personaggio; l'arma decide l'aspetto, il movimento, gli effetti e i suoni.

Armi incluse: Shuriken, Ascia (boomerang), Meteora (pioggia dal cielo), Bolla velenosa, Teschio spettrale, Stella, Pugnale.
Nuovi personaggi: Ninja, Barbaro, Astromante, Strega, Negromante.

## Suoni
Tutti gli effetti sonori e la musica chiptune sono generati dal gioco (nessun file audio).
🔊 attiva o disattiva gli effetti, ♪ la musica. Suoni disponibili per le armi:
- sparo: none, bow, throw, swish, fire, ice, zap, cannon, laser, magic, pop, chime
- impatto: none, hit, thud, crack, splat, boom, zap, chime, pop, magic, ice

## Regole della partita
**⚙ REGOLE** apre lo stesso editor per oro iniziale, vite, vita e velocità dei nemici, frequenza del boss, ecc. Il numero di nemici è `firstWave` (nemici nella prima ondata) + `perWave` (nemici in più a ogni ondata): con 6 e 2 l'ondata 10 ha 24 nemici.

## Struttura della cartella
```
index.html        pagina del gioco
css/style.css     interfaccia pixel
js/palette.js     palette, font pixel, primitive di disegno
js/sprites.js     sprite e statistiche dei nemici, generatore sprite delle torri
js/vfx.js         particelle, esplosioni, fulmini, laser, numeri del danno
js/world.js       nemici, proiettili, torri, logica di combattimento
js/map.js         mappa, sentiero, alberi, castello
js/defaults.js    personaggi di default, parser del codice, salvataggi
js/editor.js      editor (codice + pixel art + anteprima)
js/main.js        partita, ondate, input, interfaccia
js/audio.js       effetti sonori e musica (WebAudio)
js/weapons.js     armi di default, parser, salvataggi delle armi
js/weaponEditor.js editor delle armi (disegno / immagine / effetti)
```
Per modificare i nemici (vita, velocità, oro, armatura) cambia `ENEMY_TYPES` in `js/sprites.js`.
"# PixelTowerDefense" 
