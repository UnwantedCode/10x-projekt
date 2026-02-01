Frontend - Astro z React dla komponentów interaktywnych:

- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:

- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

Testowanie:

- Vitest z React Testing Library dla testów jednostkowych, komponentowych i integracyjnych
  - Vitest to nowoczesny i szybki framework do testowania, w pełni kompatybilny z Vite, na którym opiera się Astro
  - React Testing Library promuje dobre praktyki testowania komponentów z perspektywy użytkownika
- Playwright dla testów End-to-End (E2E)
  - Nowoczesne narzędzie od Microsoftu, zapewniające szybkie i niezawodne testy E2E na wszystkich głównych silnikach przeglądarek
  - Umożliwia łatwą obsługę scenariuszy logowania i testowanie złożonych interakcji

CI/CD i Hosting:

- Github Actions do tworzenia pipeline'ów CI/CD
- Cloudflare
