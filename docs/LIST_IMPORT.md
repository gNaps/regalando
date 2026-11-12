# Importare una lista JSON

In **Le mie liste → Crea una lista → Importa JSON**, selezionare il file, controllare l’anteprima e premere **Importa e crea la lista**. È sempre creata una nuova lista attiva, appartenente all’account che importa. Una selezione o un’anteprima non salva dati. Se il file non è valido, non viene creata alcuna lista.

Durante la beta, il piano gratuito include al massimo **3 liste per account**, contando anche le archiviate, e **15 regali per lista**. Al raggiungimento del limite di liste, anche l’importazione è bloccata.

Il file può contenere fino a **15 regali** e pesare al massimo **512 KB**. Un [esempio completo](../public/examples/lista.json) è scaricabile anche dalla finestra di importazione.

```json
{
  "version": 1,
  "title": "La mia lista",
  "gifts": [
    { "title": "Cuffie", "category": "tech", "priceCents": 12990 }
  ]
}
```

| Campo della lista | Regole |
| --- | --- |
| `version` | Facoltativo; se presente deve essere `1`. |
| `title` | Obbligatorio, da 1 a 100 caratteri dopo la rimozione degli spazi iniziali e finali. |
| `description` | Facoltativo, massimo 2000 caratteri. |
| `date` | Facoltativo, data reale nel formato `YYYY-MM-DD`. Omettere il campo se non serve. |
| `cover` | `plum`, `sage` o `sand`; predefinito `plum`. |
| `gifts` | Obbligatorio; array da 0 a 15 regali. |

| Campo del regalo | Regole |
| --- | --- |
| `title` | Obbligatorio, da 1 a 150 caratteri. |
| `description` | Facoltativo, massimo 3000 caratteri. |
| `priceCents` | Facoltativo, intero da 0 a 100000000. `12990` significa €129,90; omettere il campo per un prezzo libero. |
| `currency` | Facoltativo, solo `EUR`. |
| `category` | `design`, `tech`, `gaming`, `music`, `art`, `travel`, `style`, `beauty`, `experiences`, `other` o `books`; predefinito `other`. |
| `priority` | `normal` o `favorite`; predefinito `normal`. |
| `locations` | Facoltativo, massimo cinque luoghi di acquisto. |

Un luogo online contiene `kind: "online"` e `url`, un link HTTP/HTTPS valido senza credenziali. Un luogo fisico contiene `kind: "physical"`, `name` (massimo 150 caratteri) e, facoltativamente, `address` (massimo 300 caratteri).

I campi non previsti vengono segnalati come errori. Il formato importa i contenuti della lista e dei regali: immagini, proprietari, identificativi, inviti, partecipanti e prenotazioni non fanno parte del file. Le liste esistenti non vengono sovrascritte; importare lo stesso file una seconda volta crea una seconda lista.

La validazione viene ripetuta nella mutation Convex `lists.importJson`, che crea lista e regali nella stessa transazione. La funzione deve essere distribuita nell’ambiente Convex usato dall’app, insieme alle altre funzioni backend.
