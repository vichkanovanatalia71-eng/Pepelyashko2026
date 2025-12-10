# 🛡️ Library Watchdog System

## 📋 Опис

Автоматична система моніторингу та відновлення бібліотеки `libpangoft2-1.0-0`, яка необхідна для генерації PDF документів через WeasyPrint.

## 🎯 Призначення

Вирішує критичну проблему зникнення системної бібліотеки `libpangoft2-1.0-0` при перезапусках Kubernetes контейнерів. Без цієї бібліотеки весь функціонал генерації PDF (Акти, Рахунки, Накладні) та відправлення email з PDF вкладеннями не працює.

## 🔧 Як працює

1. **Моніторинг**: Кожні 5 хвилин перевіряє наявність бібліотеки
2. **Виявлення**: Якщо бібліотека відсутня - автоматично встановлює
3. **Відновлення**: Після встановлення перезапускає backend сервіс
4. **Логування**: Всі дії записуються в лог-файл

## 📁 Файли системи

- **Скрипт**: `/app/library-watchdog.sh`
- **Supervisor конфігурація**: `/etc/supervisor/conf.d/library-watchdog.conf`
- **Лог-файл**: `/var/log/library-watchdog.log`
- **Supervisor логи**: 
  - `/var/log/supervisor/library-watchdog.out.log`
  - `/var/log/supervisor/library-watchdog.err.log`

## 🚀 Управління

### Перевірити статус
```bash
sudo supervisorctl status library-watchdog
```

### Переглянути логи
```bash
tail -f /var/log/library-watchdog.log
```

### Перезапустити watchdog
```bash
sudo supervisorctl restart library-watchdog
```

### Зупинити watchdog
```bash
sudo supervisorctl stop library-watchdog
```

### Запустити watchdog
```bash
sudo supervisorctl start library-watchdog
```

## 📊 Формат логів

```
[2025-12-10 00:05:21] === Library Watchdog Started ===
[2025-12-10 00:05:21] ✓ libpangoft2-1.0-0 is present
[2025-12-10 00:06:04] ✗ libpangoft2-1.0-0 is MISSING!
[2025-12-10 00:06:04] WARNING: libpangoft2-1.0-0 is missing! Starting installation...
[2025-12-10 00:06:06] SUCCESS: libpangoft2-1.0-0 installed successfully
[2025-12-10 00:06:06] Restarting backend service...
[2025-12-10 00:06:09] SUCCESS: Backend restarted successfully
```

## ⚙️ Налаштування

### Змінити інтервал перевірки

Відредагувати файл `/app/library-watchdog.sh`, знайти рядок:
```bash
sleep 300  # 300 секунд = 5 хвилин
```

Змінити значення:
- `60` = 1 хвилина
- `180` = 3 хвилини
- `600` = 10 хвилин

Після зміни перезапустити watchdog:
```bash
sudo supervisorctl restart library-watchdog
```

## 🔍 Діагностика проблем

### Watchdog не запускається
```bash
# Перевірити supervisor логи
tail -n 100 /var/log/supervisor/library-watchdog.err.log

# Перевірити права на виконання скрипту
ls -la /app/library-watchdog.sh
# Має бути: -rwxr-xr-x (виконуваний)

# Якщо ні - додати права:
chmod +x /app/library-watchdog.sh
```

### Бібліотека не встановлюється автоматично
```bash
# Перевірити логи
tail -n 100 /var/log/library-watchdog.log

# Спробувати встановити вручну
sudo apt-get update && sudo apt-get install -y libpangoft2-1.0-0
```

### Backend не перезапускається
```bash
# Перевірити статус backend
sudo supervisorctl status backend

# Перезапустити вручну
sudo supervisorctl restart backend
```

## ✅ Переваги системи

- ✅ **Автоматичне відновлення** - не потрібна ручна інтервенція
- ✅ **Мінімальний простій** - максимум 5 хвилин після збою
- ✅ **Повне логування** - всі дії записуються
- ✅ **Незалежна робота** - працює у фоновому режимі
- ✅ **Автозапуск** - запускається при старті контейнера

## 📝 Примітки

- Watchdog запускається автоматично при старті контейнера через supervisor
- Не впливає на продуктивність системи (легкий фоновий процес)
- Гарантує стабільну роботу PDF функціоналу для всіх користувачів
- Вирішує проблему, яка виникала 16+ разів в попередніх версіях

## 🆘 Підтримка

Якщо проблеми не вирішуються автоматично, звертайтеся до технічної підтримки Emergent:
- Discord: https://discord.gg/VzKfwXC4A
- Email: support@emergent.sh

Вкажіть:
- Job ID вашого проєкту
- Вміст файлу `/var/log/library-watchdog.log`
- Опис проблеми
