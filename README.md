# Simulare Java Foundations

Simulator de examen pentru certificarea **Oracle Java Foundations**, scris în HTML, CSS și JavaScript simplu. Nu are dependențe și nu are nevoie de build.

## Ce face

- **Examen simulat:** 60 de întrebări, 120 de minute, prag de promovare 65% (39 răspunsuri corecte din 60), fără feedback până la final.
- **Exersare:** alegi temele și numărul de întrebări, verifici fiecare răspuns pe loc și vezi explicația.
- **Greșelile mele:** refaci doar întrebările la care ai greșit data trecută.
- Tipuri de întrebări: răspuns unic, răspunsuri multiple, adevărat/fals și răspuns scris (rezultatul unui cod).
- Întrebările și variantele de răspuns sunt amestecate la fiecare test.
- Hartă a întrebărilor, marcare pentru revenire, timer, rezultat pe teme și revizuire detaliată.
- Temă luminoasă sau întunecată, funcționează pe telefon.
- Istoricul, greșelile și tema se salvează local în browser (`localStorage`).

## Teme acoperite

Bazele Java, tipuri de date și operatori, decizii și bucle, String și StringBuilder, tablouri și ArrayList, clase și obiecte, moștenire și interfețe, excepții.

## Structura proiectului

```
index.html          pagina principală
css/style.css       stiluri
js/app.js           logica aplicației
data/questions.js   banca de întrebări
```

## Rulare locală

Deschide `index.html` în browser. Nu este nevoie de server.

Dacă preferi un server local:

```bash
python -m http.server 8000
```

apoi deschide http://localhost:8000.

## Publicare pe GitHub Pages

```bash
git init
git add .
git commit -m "Simulare Java Foundations"
git branch -M main
git remote add origin https://github.com/<utilizator>/<repo>.git
git push -u origin main
```

Pe GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main, folder: / (root)**. După un minut, site-ul apare la `https://<utilizator>.github.io/<repo>/`.

## Cum adaugi întrebări

Editează `data/questions.js`. Răspunsul corect se scrie **primul**, iar aplicația amestecă ordinea la afișare.

```js
// răspuns unic: S(tema, întrebare, [corect, greșit1, greșit2, ...], explicație, cod?)
S('types', 'What is the output?',
  ['3', '2', '2.5', '3.0'],
  'Math.round(2.5) returnează 3.',
  'System.out.println(Math.round(2.5));'),

// răspunsuri multiple: M(tema, întrebare, [corecte...], [greșite...], explicație, cod?)
M('basics', 'Which TWO are valid identifiers?', ['_a', '$b'], ['1c', 'class'], 'Explicație.'),

// adevărat / fals: T(tema, întrebare, true|false, explicație, cod?)
T('strings', 'String objects are immutable.', true, 'Explicație.'),

// răspuns scris: X(tema, întrebare, [răspunsuri acceptate], explicație, cod?)
X('control', 'What is printed? (type the number)', ['6'], 'Explicație.', 'int s = 1 + 2 + 3;\nSystem.out.println(s);'),
```

Teme disponibile: `basics`, `types`, `control`, `strings`, `arrays`, `oop`, `inherit`, `exceptions`. Pentru o temă nouă, adaug-o și în obiectul `TOPICS` din `js/app.js`.

Întrebările se identifică după textul și codul lor. Dacă schimbi textul unei întrebări, ea apare ca întrebare nouă în lista „Greșelile mele".

## Notă importantă

Proiectul nu este afiliat Oracle. Întrebările sunt scrise original, în stilul și pe temele examenului, și nu provin din testul oficial. Formatul examenului (număr de întrebări, durată, prag) poate varia în funcție de versiune, așa că verifică pe site-ul Oracle înainte de examenul real. Valorile se schimbă ușor în obiectul `EXAM` din `js/app.js`.

*Oracle și Java sunt mărci înregistrate ale Oracle și/sau ale afiliaților săi.*

## Licență

MIT, vezi fișierul `LICENSE`.
