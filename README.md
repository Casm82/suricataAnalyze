# suricataAnalyze
Выбирает dns записи из журналов /var/log/suricata.
Сохраняет записи в MongoDB.

Взаимодействие через web-интерфейс.
Можно искать записи, составлять списки исключений.

Сертификаты необходимо сгенерировать вручную и поместить в каталог cert.

Настройки в файле settings.json

# Требования:
* Node.js
* MongoDB
* поддерживает аутентификацию через SPNEGO (нужно сгенерировать kerberos.keytab и перед запуском экспортировать переменную окружения KRB5_KTNAME=<путь>/kerberos.keytab)
