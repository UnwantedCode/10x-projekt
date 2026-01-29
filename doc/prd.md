# Dokument wymagań produktu (PRD) - AI Task Manager (MVP)

## 1. Przegląd produktu

1.1. Cel produktu  
AI Task Manager (MVP) to webowa aplikacja do zarządzania zadaniami, której celem jest pomoc pracownikom biurowym w ustalaniu priorytetów i skuteczniejszym planowaniu dnia lub tygodnia pracy. Kluczową wartością jest prosty model priorytetów oraz opcjonalne wsparcie AI w formie sugestii priorytetu z krótkim uzasadnieniem.

1.2. Docelowy użytkownik

- Pracownik biurowy, który:
  - regularnie planuje dzień lub tydzień pracy,
  - pracuje na wielu listach zadań (np. „Dziś”, „Ten tydzień”, „Projekt A”),
  - chce szybko ustalić, co jest najważniejsze, bez rozbudowanego planowania typu kalendarz.

    1.3. Kontekst użycia (MVP)

- Aplikacja webowa, użytkownik loguje się i tworzy zadania na aktualnie otwartej liście.
- Zadania mają prosty cykl życia: Do zrobienia -> Zrobione.
- AI nie wykonuje zmian automatycznie; sugeruje, a decyzja należy do użytkownika.

  1.4. Założenia i zasady domenowe

- Zadanie składa się z: tytuł, opis, priorytet (Niski/Średni/Wysoki), status (Do zrobienia/Zrobione).
- Priorytet jest wymagany przy tworzeniu zadania.
- Zmiana statusu na „Zrobione” jest jedyną definicją „zadania gotowego” w MVP.
- Zadania „Zrobione” są domyślnie ukryte i dostępne poprzez filtr.
- Użytkownik może ręcznie zmieniać priorytet w dowolnym momencie, niezależnie od AI.
- Użytkownik może ręcznie porządkować kolejność zadań w ramach tego samego priorytetu.
- Nowe zadania trafiają do aktualnie otwartej listy.

  1.5. Wymagania niefunkcjonalne (wysoki poziom)

- Zgodność z RODO (minimalizacja danych, transparentność, bezpieczeństwo).
- Bezpieczne logowanie i zarządzanie sesją.
- Skalowalność do około 1000 użytkowników w MVP.
- Rejestrowanie interakcji z AI (decyzje i powody) dla analityki i przyszłej personalizacji.

## 2. Problem użytkownika

2.1. Główny problem  
Użytkownicy mają trudność z ustaleniem, które zadania są najważniejsze. Skutkuje to nieefektywnym zarządzaniem listą obowiązków: zadania są wykonywane w przypadkowej kolejności, a kluczowe działania są odkładane.

2.2. Objawy problemu w zachowaniu użytkownika

- Zbyt długa lista zadań bez jasnej hierarchii ważności.
- Niepewność, jak ocenić pilność i wpływ zadania.
- Ręczne priorytety bywają niespójne w czasie (inne kryteria każdego dnia/tygodnia).
- Niska satysfakcja z organizacji pracy i poczucie chaosu.

  2.3. Dlaczego obecne metody są niewystarczające (dla MVP)

- Klasyczne listy TODO nie wspierają użytkownika w ocenie ważności.
- Rozbudowane narzędzia (kalendarze, harmonogramy) są zbyt ciężkie jak na potrzebę szybkiego ustalenia priorytetu.
- Użytkownicy potrzebują prostego, szybkiego mechanizmu weryfikacji priorytetu, bez automatyzacji podejmowania decyzji.

  2.4. Kluczowa wartość proponowanego rozwiązania

- Trójstopniowe priorytety i czytelna organizacja list.
- Opcjonalne AI jako „druga opinia” priorytetu wraz z jednozdaniowym uzasadnieniem.
- Zachowanie kontroli po stronie użytkownika (akceptacja, modyfikacja, odrzucenie z powodem).

## 3. Wymagania funkcjonalne

3.1. Konto użytkownika i dostęp

- Rejestracja użytkownika.
- Logowanie użytkownika.
- Wylogowanie.
- Ochrona danych użytkownika: użytkownik widzi i edytuje wyłącznie swoje listy i zadania.
- Podstawowe zarządzanie sesją (np. utrzymanie zalogowania, wygasanie sesji, obsługa błędów autoryzacji).

  3.2. Listy zadań (wielolistowość)

- Tworzenie listy zadań.
- Przegląd list (np. nawigacja między listami).
- Zmiana nazwy listy.
- Usuwanie listy (z zachowaniem zasad bezpieczeństwa danych).
- Ustawienie aktywnej listy (kontekst dodawania zadań).
- Dodawanie nowych zadań zawsze do aktualnie otwartej listy.

  3.3. Zadania (CRUD i model zadania)

- Dodawanie zadania:
  - tytuł (wymagany),
  - opis (opcjonalny, ale zalecany),
  - priorytet (wymagany: Niski/Średni/Wysoki),
  - status domyślny: Do zrobienia.
- Edycja zadania (tytuł, opis, priorytet).
- Usuwanie zadania.
- Przegląd listy zadań dla aktywnej listy.

  3.4. Status i widoki zadań

- Zmiana statusu zadania: Do zrobienia <-> Zrobione.
- Domyślnie ukrywanie zadań „Zrobione”.
- Filtr umożliwiający wyświetlenie zadań „Zrobione” (oraz powrót do widoku domyślnego).

  3.5. Sortowanie, filtrowanie i kolejność ręczna

- Sortowanie zadań po priorytecie (np. Wysoki -> Średni -> Niski).
- Filtrowanie (minimum):
  - tylko niezrobione (domyślne),
  - uwzględnij zrobione (przez filtr).
- Ręczne porządkowanie zadań w ramach tego samego priorytetu (drag and drop lub alternatywny mechanizm zmiany pozycji).

  3.6. AI: sugestia priorytetu (opcjonalna)

- Przycisk „Zasugeruj” dostępny w kontekście tworzenia/edycji zadania.
- AI analizuje opis (i ewentualnie tytuł) i proponuje:
  - sugerowany priorytet (Niski/Średni/Wysoki),
  - jednozdaniowe uzasadnienie.
- Użytkownik może:
  - zaakceptować sugestię (ustawia priorytet zgodnie z AI),
  - zmodyfikować sugestię (ustawia inny priorytet),
  - odrzucić sugestię z podaniem powodu (wymagane pole powodu w przypadku odrzucenia).
- AI nie zmienia priorytetu bez akcji użytkownika.

  3.7. Analityka interakcji z AI (zbieranie danych)

- Zapis każdej interakcji z AI dla zadania:
  - treść wejściowa (np. opis przekazany do AI) lub bezpieczny ekwiwalent (np. skrót/metadata), zgodny z RODO,
  - sugerowany priorytet i uzasadnienie,
  - decyzja użytkownika: akceptacja / modyfikacja / odrzucenie,
  - jeśli modyfikacja: finalny priorytet,
  - jeśli odrzucenie: powód odrzucenia,
  - czas podjęcia decyzji (np. różnica czasu od sugestii do akcji).
- Dane służą do analityki MVP i planowania przyszłej personalizacji.

  3.8. Onboarding produktowy

- Jednorazowy onboarding po pierwszym uruchomieniu, wyjaśniający:
  - model priorytetów,
  - sposób sortowania,
  - rolę AI jako sugestii.
- Możliwość ponownego uruchomienia onboardingu z poziomu aplikacji (np. w ustawieniach lub menu pomocy).

  3.9. Obsługa błędów i stany systemowe (MVP)

- Czytelne komunikaty dla użytkownika w przypadkach:
  - niepoprawne dane wejściowe (np. brak tytułu, brak priorytetu),
  - brak dostępu (sesja wygasła),
  - błąd generowania sugestii AI,
  - błąd sieci / serwera.

## 4. Granice produktu

4.1. W zakresie MVP

- Aplikacja webowa dla pojedynczego użytkownika (bez współdzielenia).
- Wiele list zadań na użytkownika.
- Prosty model zadania (tytuł, opis, priorytet, status).
- AI jako opcjonalna sugestia priorytetu z uzasadnieniem.
- Sortowanie, filtrowanie i ręczne porządkowanie w ramach priorytetu.
- Onboarding + możliwość powrotu do onboardingu.
- Rejestrowanie interakcji z AI do analityki.

  4.2. Poza zakresem MVP (nie realizować)

- Współdzielenie zadań z innymi użytkownikami.
- Kalendarz, harmonogramy, przypomnienia czasowe.
- Automatyczna zmiana priorytetu przez AI bez decyzji użytkownika.
- Rozbudowane planowanie: etapy, podzadania, zależności.
- Aplikacja mobilna.

  4.3. Otwarte kwestie i ograniczenia w MVP

- Brak twardych limitów liczby list i zadań na użytkownika (monitorować i w razie potrzeby doprecyzować w kolejnych iteracjach).
- Brak zdefiniowanych wymagań wydajności UI (SLA) w MVP; wymagana jest jednak stabilność i użyteczność dla około 1000 użytkowników.
- Brak decyzji dotyczącej przyszłej personalizacji AI (MVP tylko zbiera dane i metryki).

  4.4. Ryzyka produktowe

- Brak zaufania do AI (użytkownik ignoruje sugestie lub uznaje je za nietrafne).
- Niska adopcja onboardingu (użytkownik nie rozumie modelu priorytetów ani roli AI).

## 5. Historyjki użytkowników

### US-001 Rejestracja konta

Opis: Jako nowy użytkownik chcę utworzyć konto, aby mieć prywatny dostęp do własnych list i zadań.  
Kryteria akceptacji:

- Użytkownik może podać dane rejestracyjne wymagane przez system.
- System tworzy konto i umożliwia zalogowanie po udanej rejestracji.
- Jeśli dane są niepoprawne lub konto już istnieje, system pokazuje komunikat błędu i nie tworzy konta.

### US-002 Logowanie do aplikacji

Opis: Jako użytkownik chcę się zalogować, aby uzyskać dostęp do swoich list i zadań.  
Kryteria akceptacji:

- Użytkownik może wprowadzić dane logowania i uzyskać dostęp do aplikacji.
- Przy błędnych danych logowania system odmawia dostępu i wyświetla czytelny komunikat.
- Po zalogowaniu użytkownik widzi swoje listy i aktualnie aktywną listę (lub stan pusty, jeśli brak list).

### US-003 Bezpieczny dostęp i autoryzacja zasobów

Opis: Jako użytkownik chcę mieć pewność, że nikt poza mną nie zobaczy moich list i zadań.  
Kryteria akceptacji:

- Użytkownik widzi wyłącznie swoje listy i zadania.
- Próba dostępu do zasobów innego użytkownika jest blokowana (brak danych i komunikat o braku uprawnień).
- Po wygaśnięciu sesji użytkownik jest proszony o ponowne zalogowanie.

### US-004 Wylogowanie

Opis: Jako użytkownik chcę się wylogować, aby zakończyć bezpiecznie sesję.  
Kryteria akceptacji:

- Użytkownik może wylogować się z aplikacji.
- Po wylogowaniu dostęp do danych jest zablokowany do czasu ponownego zalogowania.
- Próba wejścia na chronione widoki przekierowuje do logowania.

### US-005 Utworzenie listy zadań

Opis: Jako użytkownik chcę utworzyć nową listę zadań, aby organizować pracę tematycznie lub czasowo.  
Kryteria akceptacji:

- Użytkownik może utworzyć listę podając nazwę.
- Nowa lista pojawia się na liście list użytkownika.
- System ustawia nową listę jako aktywną lub pozwala użytkownikowi wybrać ją jako aktywną.

### US-006 Przegląd i przełączanie aktywnej listy

Opis: Jako użytkownik chcę przełączać się między listami, aby widzieć i edytować zadania w wybranym kontekście.  
Kryteria akceptacji:

- Użytkownik widzi zestaw swoich list.
- Użytkownik może wybrać listę i staje się ona aktywna.
- Widok zadań aktualizuje się do zadań z aktywnej listy.

### US-007 Zmiana nazwy listy

Opis: Jako użytkownik chcę zmienić nazwę listy, aby lepiej odzwierciedlała jej przeznaczenie.  
Kryteria akceptacji:

- Użytkownik może edytować nazwę istniejącej listy.
- Po zapisaniu nazwa jest widoczna w nawigacji i nagłówku listy.
- Jeśli nazwa jest pusta lub niepoprawna, system blokuje zapis i pokazuje błąd.

### US-008 Usunięcie listy

Opis: Jako użytkownik chcę usunąć listę, której już nie potrzebuję, aby utrzymać porządek.  
Kryteria akceptacji:

- Użytkownik może usunąć listę po potwierdzeniu akcji.
- Po usunięciu lista i jej zadania nie są widoczne w aplikacji.
- Jeśli usunięta lista była aktywna, system wybiera inną listę jako aktywną lub pokazuje stan pusty.

### US-009 Dodanie zadania do aktywnej listy

Opis: Jako użytkownik chcę dodać zadanie, aby zapisać obowiązek do wykonania w bieżącej liście.  
Kryteria akceptacji:

- Użytkownik może wprowadzić tytuł, opcjonalny opis oraz musi wybrać priorytet.
- Nowe zadanie trafia do aktualnie aktywnej listy.
- Zadanie ma status domyślny „Do zrobienia”.
- Jeśli brakuje tytułu lub priorytetu, system nie zapisuje zadania i wyświetla błąd.

### US-010 Edycja zadania

Opis: Jako użytkownik chcę edytować zadanie, aby aktualizować tytuł, opis lub priorytet.  
Kryteria akceptacji:

- Użytkownik może zmienić tytuł, opis oraz priorytet zadania.
- Zmiany są zapisane i widoczne na liście.
- Jeśli tytuł zostanie usunięty lub priorytet nie zostanie ustawiony, system blokuje zapis.

### US-011 Usunięcie zadania

Opis: Jako użytkownik chcę usunąć zadanie, które jest nieaktualne, aby lista była przejrzysta.  
Kryteria akceptacji:

- Użytkownik może usunąć zadanie po potwierdzeniu.
- Usunięte zadanie znika z listy i nie jest dostępne w filtrach.
- System nie usuwa innych zadań ani nie zmienia kolejności poza konsekwencją usunięcia.

### US-012 Oznaczenie zadania jako „Zrobione”

Opis: Jako użytkownik chcę oznaczyć zadanie jako zrobione, aby odzwierciedlić postęp pracy.  
Kryteria akceptacji:

- Użytkownik może zmienić status zadania z „Do zrobienia” na „Zrobione”.
- Zmiana statusu jest jedyną akcją wymaganą do uznania zadania za gotowe.
- Zadanie „Zrobione” znika z widoku domyślnego.

### US-013 Przywrócenie zadania do „Do zrobienia”

Opis: Jako użytkownik chcę przywrócić zadanie oznaczone jako zrobione, jeśli muszę wrócić do jego realizacji.  
Kryteria akceptacji:

- Użytkownik może zmienić status z „Zrobione” na „Do zrobienia”.
- Zadanie wraca do widoku domyślnego (o ile filtr nie ukrywa niezrobionych).
- Zmiana jest zapisana i widoczna po odświeżeniu.

### US-014 Domyślne ukrywanie zadań „Zrobione”

Opis: Jako użytkownik chcę, aby zrobione zadania były ukryte domyślnie, aby skupić się na aktualnych działaniach.  
Kryteria akceptacji:

- Widok listy zadań domyślnie pokazuje tylko „Do zrobienia”.
- Zadania „Zrobione” nie są widoczne bez zmiany filtra.
- Po wejściu na listę ponownie domyślny widok pozostaje taki sam.

### US-015 Filtr wyświetlający zadania „Zrobione”

Opis: Jako użytkownik chcę włączyć filtr pokazujący zrobione zadania, aby móc do nich wrócić lub je przejrzeć.  
Kryteria akceptacji:

- Użytkownik może włączyć filtr pokazujący zadania „Zrobione”.
- Użytkownik może wrócić do widoku domyślnego (ukryte zrobione).
- Filtr nie zmienia danych, jedynie widok.

### US-016 Sortowanie zadań po priorytecie

Opis: Jako użytkownik chcę sortować zadania po priorytecie, aby najważniejsze zadania były na górze.  
Kryteria akceptacji:

- Po włączeniu sortowania priorytet jest uporządkowany: Wysoki, następnie Średni, następnie Niski.
- Zadania w ramach tego samego priorytetu zachowują kolejność ręczną użytkownika.
- Zmiana priorytetu zadania powoduje jego przeniesienie do właściwej sekcji priorytetu.

### US-017 Ręczne porządkowanie zadań w ramach tego samego priorytetu

Opis: Jako użytkownik chcę ręcznie ustalić kolejność zadań o tym samym priorytecie, aby odzwierciedlić moją kolejność pracy.  
Kryteria akceptacji:

- Użytkownik może zmienić kolejność zadań w ramach tego samego priorytetu.
- System zapisuje kolejność i odtwarza ją przy ponownym wejściu na listę.
- Zmiana kolejności nie jest możliwa między różnymi priorytetami (to realizuje zmiana priorytetu).

### US-018 Ręczna zmiana priorytetu niezależnie od AI

Opis: Jako użytkownik chcę ręcznie zmieniać priorytet zadania w dowolnym momencie, aby mieć pełną kontrolę nad listą.  
Kryteria akceptacji:

- Użytkownik może zmienić priorytet zadania bez korzystania z AI.
- Zmiana jest natychmiast widoczna w widoku listy.
- Zmiana priorytetu wpływa na sortowanie (zadanie trafia do odpowiedniej sekcji).

### US-019 Uruchomienie sugestii AI priorytetu dla zadania

Opis: Jako użytkownik chcę uruchomić AI, aby uzyskać sugestię priorytetu na podstawie opisu zadania.  
Kryteria akceptacji:

- Użytkownik może kliknąć przycisk „Zasugeruj” w kontekście zadania.
- System wyświetla sugerowany priorytet oraz jednozdaniowe uzasadnienie.
- Jeśli wystąpi błąd AI, system pokazuje czytelny komunikat i nie zmienia priorytetu.

### US-020 Akceptacja sugestii AI

Opis: Jako użytkownik chcę zaakceptować sugestię AI, aby szybko ustawić priorytet zgodnie z rekomendacją.  
Kryteria akceptacji:

- Użytkownik może zaakceptować sugestię AI.
- Po akceptacji priorytet zadania jest ustawiony zgodnie z sugestią.
- Decyzja „akceptacja” jest zapisana w historii interakcji AI.

### US-021 Modyfikacja sugestii AI

Opis: Jako użytkownik chcę zmodyfikować sugestię AI, aby ustawić priorytet inaczej, jeśli mam inne zdanie.  
Kryteria akceptacji:

- Użytkownik może wybrać priorytet inny niż sugerowany przez AI.
- Finalny priorytet zostaje zapisany na zadaniu.
- System zapisuje decyzję „modyfikacja” oraz finalny priorytet w historii interakcji AI.

### US-022 Odrzucenie sugestii AI z podaniem powodu

Opis: Jako użytkownik chcę odrzucić sugestię AI i podać powód, aby system zbierał informację zwrotną.  
Kryteria akceptacji:

- Użytkownik może odrzucić sugestię AI.
- Podanie powodu odrzucenia jest wymagane do zatwierdzenia odrzucenia.
- Priorytet zadania nie zmienia się automatycznie po odrzuceniu.
- System zapisuje decyzję „odrzucenie” oraz powód w historii interakcji AI.

### US-023 Rejestrowanie historii interakcji z AI dla analityki

Opis: Jako właściciel produktu chcę rejestrować interakcje z AI, aby mierzyć skuteczność sugestii i planować personalizację.  
Kryteria akceptacji:

- System zapisuje każdą sugestię AI wraz z wynikiem i uzasadnieniem.
- System zapisuje decyzję użytkownika (akceptacja/modyfikacja/odrzucenie) i wymagane atrybuty (finalny priorytet lub powód).
- System zapisuje czas od wygenerowania sugestii do decyzji użytkownika.

### US-024 Jednorazowy onboarding po pierwszym uruchomieniu

Opis: Jako nowy użytkownik chcę onboarding, aby zrozumieć priorytety i rolę AI w aplikacji.  
Kryteria akceptacji:

- Onboarding uruchamia się automatycznie przy pierwszym wejściu po założeniu konta lub pierwszym użyciu aplikacji.
- Onboarding wyjaśnia model priorytetów i to, że AI jest sugestią (nie automatem).
- Użytkownik może zakończyć onboarding i przejść do aplikacji.

### US-025 Powrót do onboardingu z poziomu aplikacji

Opis: Jako użytkownik chcę wrócić do onboardingu, aby przypomnieć sobie zasady priorytetów i działania AI.  
Kryteria akceptacji:

- Użytkownik ma możliwość uruchomienia onboardingu z poziomu aplikacji.
- Onboarding wyświetla te same kluczowe informacje co przy pierwszym uruchomieniu.
- Po zakończeniu użytkownik wraca do poprzedniego kontekstu aplikacji.

### US-026 Obsługa stanu pustego (brak list lub brak zadań)

Opis: Jako użytkownik chcę widzieć czytelne wskazówki, gdy nie mam jeszcze list lub zadań, aby wiedzieć co zrobić dalej.  
Kryteria akceptacji:

- Jeśli użytkownik nie ma list, system pokazuje stan pusty z akcją utworzenia listy.
- Jeśli użytkownik ma listę bez zadań, system pokazuje stan pusty z akcją dodania zadania.
- Stany puste nie blokują użytkownika i prowadzą do właściwych akcji.

### US-027 Obsługa błędów walidacji podczas tworzenia/edycji zadania

Opis: Jako użytkownik chcę widzieć jasne komunikaty walidacji, aby poprawnie zapisać zadanie.  
Kryteria akceptacji:

- Brak tytułu powoduje błąd i brak zapisu.
- Brak priorytetu powoduje błąd i brak zapisu.
- Komunikaty są zrozumiałe i wskazują, co należy poprawić.

### US-028 Obsługa błędów sieci i błędów serwera

Opis: Jako użytkownik chcę otrzymać informację o problemach technicznych, aby wiedzieć, że to nie moja wina i co mogę zrobić dalej.  
Kryteria akceptacji:

- Przy błędzie sieci system informuje o braku połączenia i umożliwia ponowienie akcji.
- Przy błędzie serwera system informuje o problemie i nie powoduje utraty danych w formularzu (jeśli to możliwe).
- Błędy AI nie wpływają na możliwość ręcznego ustawiania priorytetu.

### US-029 Zachowanie spójności danych przy równoczesnych zmianach (scenariusz skrajny)

Opis: Jako użytkownik chcę, aby aplikacja zachowywała spójność, gdy wykonuję szybkie zmiany (np. zmiana priorytetu i sortowanie), aby nie tracić efektów pracy.  
Kryteria akceptacji:

- Po zmianie priorytetu i odświeżeniu widoku zadanie ma zapisany finalny priorytet.
- Ręczna kolejność w ramach priorytetu pozostaje zachowana po operacjach sortowania i filtrów.
- System nie duplikuje zadań i nie gubi zmian.

## 6. Metryki sukcesu

6.1. KPI produktu (MVP)

- Pomocność AI:
  - co najmniej 80% użytkowników uznaje sugestie AI za pomocne w organizacji zadań (np. ankieta w aplikacji lub cykliczny feedback).
- Aktywność użytkowników:
  - co najmniej 75% użytkowników generuje jedną lub więcej listę zadań w tygodniu.

    6.2. Metryki behawioralne i produktowe (telemetria)

- Liczba kliknięć „Zasugeruj” na użytkownika / tydzień.
- Odsetek sugestii AI zakończonych:
  - akceptacją,
  - modyfikacją,
  - odrzuceniem (z powodem).
- Czas od wygenerowania sugestii AI do decyzji (akceptacja/modyfikacja/odrzucenie).
- Aktywność tygodniowa użytkowników (WAU).
- Liczba utworzonych list na użytkownika / tydzień.
- Liczba utworzonych zadań na użytkownika / tydzień (uwzględnia także zadania z priorytetem ustawionym ręcznie, bez AI).
- Odsetek zadań oznaczonych jako „Zrobione” (jako sygnał użycia i domknięcia pracy).

  6.3. Metryki jakości onboardingu (ryzyko adopcji)

- Odsetek użytkowników, którzy ukończyli onboarding.
- Odsetek użytkowników, którzy wracają do onboardingu z poziomu aplikacji.
- Korelacja ukończenia onboardingu z użyciem AI i sortowania priorytetów.

  6.4. Lista kontrolna po przeglądzie PRD (wymagania jakości)

- Każdą historyjkę użytkownika można przetestować: tak, każda ma jednoznaczne kryteria akceptacji.
- Kryteria akceptacji są jasne i konkretne: tak, obejmują warunki wejścia, akcje i oczekiwany rezultat.
- Wystarczająco dużo historyjek do zbudowania w pełni funkcjonalnej aplikacji: tak, uwzględniono konta, listy, zadania, statusy, widoki, sortowanie, AI, onboarding, analitykę oraz scenariusze błędów i skrajne.
- Uwzględniono uwierzytelnianie i autoryzację: tak (US-002, US-003, US-004).
