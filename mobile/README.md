# MedFlow Mobile

Flutter-додаток для управління фінансами медичної практики ФОП. Обгортка для MedFlow FastAPI бекенду.

## Швидкий старт

```bash
cd mobile
flutter pub get
flutter run
```

## Налаштування API URL

Відредагуйте `lib/core/constants/api_endpoints.dart`:

- **Android емулятор:** `http://10.0.2.2:8000`
- **iOS симулятор:** `http://localhost:8000`
- **Production (Railway):** `https://your-backend.up.railway.app`

## Структура

```
lib/
├── main.dart                          # Точка входу
├── core/
│   ├── api/api_client.dart           # Dio HTTP-клієнт з авто-токеном
│   ├── constants/api_endpoints.dart  # URL-и API
│   ├── routing/app_router.dart       # GoRouter навігація
│   └── theme/app_theme.dart          # Material 3 тема
├── features/
│   ├── auth/                         # Вхід + Реєстрація
│   ├── dashboard/                    # Дашборд з фін. звітами
│   ├── expenses/                     # Список витрат
│   └── services/                     # Список послуг
└── shared/widgets/                   # Загальні віджети (AppShell)
```

## Збірка

```bash
# Android (AAB для Google Play)
flutter build appbundle --release

# iOS (потрібен Mac з Xcode)
flutter build ipa --release
```
