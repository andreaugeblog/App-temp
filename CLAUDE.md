# Registro Mensual

Web app in Spanish (the user writes in Italian; the app text stays Spanish).

- Source: `registro/index.html` (also published as a claude.ai artifact).
- Installable build: `docs/`, generated with `python3 tools/build_pwa.py` and served by GitHub Pages
  from branch `ccr-64117285-gwxcjw`, folder `/docs`.

## Rule: every version must keep the data of the previous one

People update the installed app without exporting first, so a new version must never lose or
scramble what an older version saved (localStorage on the phone, the db on claude.ai, and files
made with Exportar).

- Never rename or drop a stored key. When the data shape changes, read the old shape and convert
  it forward (see `fixedCells()`, `rows3()` with `leg`, `withBuiltIn()`, `startDay()`).
- New fields need a default for data that does not have them yet.
- Importar must still accept files exported by older versions.
- The app keeps a copy of all stored data from before an update under
  `registro-mensile-v1:backup`; bump `APP_VERSION` in the boot code when the data shape changes.
- Before publishing, run the upgrade test against at least the previous published commit:
  `node tools/compat_test.js <previous-commit>` (playwright; must print `OK`).
