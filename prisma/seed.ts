import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('Otium2025!', 12)

  // ─── Admin ───────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@otiumweek.it' },
    update: {},
    create: {
      email: 'admin@otiumweek.it',
      password,
      nome: 'Admin',
      cognome: 'Otium',
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin creato:', admin.email)

  // ─── Host user + profilo ─────────────────────────────────────────────
  const hostUser = await prisma.user.upsert({
    where: { email: 'host@otiumweek.it' },
    update: {},
    create: {
      email: 'host@otiumweek.it',
      password,
      nome: 'Marco',
      cognome: 'Rossi',
      role: 'HOST',
    },
  })

  const host = await prisma.host.upsert({
    where: { userId: hostUser.id },
    update: {},
    create: {
      userId: hostUser.id,
      nomeAzienda: 'Agriturismo Il Poggio',
      partitaIva: '01234567890',
      codiceFiscale: 'RSSMRC80A01H501Z',
      telefono: '+39 333 1234567',
      indirizzo: 'Via dei Colli 42',
      citta: 'Montepulciano',
      provincia: 'SI',
      cap: '53045',
      regione: 'Toscana',
      piano: 'PARTNER_PREMIUM',
      statoAbbonamento: 'ATTIVO',
      dataInizioAbb: new Date('2025-01-01'),
      dataFineAbb: new Date('2026-12-31'),
      fattNomeAzienda: 'Agriturismo Il Poggio SRL',
      fattPartitaIva: '01234567890',
      fattIndirizzo: 'Via dei Colli 42',
      fattCitta: 'Montepulciano',
      fattCap: '53045',
      fattProvincia: 'SI',
    },
  })
  console.log('✅ Host creato:', hostUser.email, '→', host.nomeAzienda)

  // ─── Struttura 1: B&B ────────────────────────────────────────────────
  const struttura1 = await prisma.struttura.create({
    data: {
      hostId: host.id,
      nome: 'B&B Il Poggio',
      tipo: 'ALLOGGIO',
      descrizione: 'Incantevole B&B immerso nelle colline toscane con vista sulla Val d\'Orcia',
      indirizzo: 'Via dei Colli 42',
      citta: 'Montepulciano',
      regione: 'Toscana',
      capacitaTotale: 5,
      prezzoBase: 80,
      attiva: true,
    },
  })

  // Unità del B&B
  const camere = await Promise.all([
    prisma.unitaPrenotabile.create({
      data: {
        strutturaId: struttura1.id,
        nome: 'Camera Girasole',
        descrizione: 'Camera doppia con balcone e vista colline',
        capacita: 2,
        lettiExtra: 1,
        piano: 1,
        prezzoBase: 90,
        prezzoLettoExtra: 25,
        statoHK: 'PULITA',
      },
    }),
    prisma.unitaPrenotabile.create({
      data: {
        strutturaId: struttura1.id,
        nome: 'Camera Lavanda',
        descrizione: 'Camera matrimoniale con bagno in camera',
        capacita: 2,
        lettiExtra: 0,
        piano: 1,
        prezzoBase: 80,
        statoHK: 'PULITA',
      },
    }),
    prisma.unitaPrenotabile.create({
      data: {
        strutturaId: struttura1.id,
        nome: 'Camera Olivo',
        descrizione: 'Camera tripla con angolo relax',
        capacita: 3,
        lettiExtra: 1,
        piano: 2,
        prezzoBase: 110,
        prezzoLettoExtra: 25,
        statoHK: 'SPORCA',
      },
    }),
    prisma.unitaPrenotabile.create({
      data: {
        strutturaId: struttura1.id,
        nome: 'Suite Vigneto',
        descrizione: 'Suite con salottino e terrazza panoramica',
        capacita: 2,
        lettiExtra: 2,
        piano: 2,
        prezzoBase: 150,
        prezzoLettoExtra: 30,
        statoHK: 'PULITA',
      },
    }),
    prisma.unitaPrenotabile.create({
      data: {
        strutturaId: struttura1.id,
        nome: 'Camera Cipresso',
        descrizione: 'Camera economy con giardino',
        capacita: 2,
        lettiExtra: 0,
        piano: 0,
        prezzoBase: 65,
        statoHK: 'PULITA',
      },
    }),
  ])
  console.log('✅ Struttura 1:', struttura1.nome, `(${camere.length} camere)`)

  // ─── Struttura 2: Agriturismo ────────────────────────────────────────
  const struttura2 = await prisma.struttura.create({
    data: {
      hostId: host.id,
      nome: 'Agriturismo Le Querce',
      tipo: 'ALLOGGIO',
      descrizione: 'Casale ristrutturato con piscina e ristorante tipico',
      indirizzo: 'Strada delle Querce 8',
      citta: 'Pienza',
      regione: 'Toscana',
      capacitaTotale: 3,
      prezzoBase: 100,
      attiva: true,
    },
  })

  const camere2 = await Promise.all([
    prisma.unitaPrenotabile.create({
      data: {
        strutturaId: struttura2.id,
        nome: 'Appartamento Rustico',
        descrizione: 'Bilocale con angolo cottura e camino',
        capacita: 4,
        lettiExtra: 1,
        piano: 0,
        prezzoBase: 120,
        prezzoLettoExtra: 20,
        statoHK: 'PULITA',
      },
    }),
    prisma.unitaPrenotabile.create({
      data: {
        strutturaId: struttura2.id,
        nome: 'Camera Tramonto',
        descrizione: 'Camera doppia con vista piscina',
        capacita: 2,
        lettiExtra: 0,
        piano: 1,
        prezzoBase: 100,
        statoHK: 'PULITA',
      },
    }),
    prisma.unitaPrenotabile.create({
      data: {
        strutturaId: struttura2.id,
        nome: 'Camera Fonte',
        descrizione: 'Camera singola con giardino privato',
        capacita: 1,
        lettiExtra: 1,
        piano: 0,
        prezzoBase: 70,
        prezzoLettoExtra: 25,
        statoHK: 'IN_PULIZIA',
      },
    }),
  ])
  console.log('✅ Struttura 2:', struttura2.nome, `(${camere2.length} camere)`)

  // ─── Prenotazioni di test ────────────────────────────────────────────
  const oggi = new Date()
  const giorno = (offset: number) => {
    const d = new Date(oggi)
    d.setDate(d.getDate() + offset)
    return d
  }

  const prenotazioni = await Promise.all([
    // Ospite in casa oggi (arrivato ieri, parte domani)
    prisma.prenotazione.create({
      data: {
        hostId: host.id,
        strutturaId: struttura1.id,
        unitaId: camere[0].id,
        guestNome: 'Anna',
        guestCognome: 'Bianchi',
        guestEmail: 'anna.bianchi@email.it',
        guestTelefono: '+39 340 1111111',
        dataArrivo: giorno(-1),
        dataPartenza: giorno(1),
        numOspiti: 2,
        stato: 'CONFERMATA',
        prezzoTotale: 180,
        fonte: 'Web',
      },
    }),
    // Arrivo oggi
    prisma.prenotazione.create({
      data: {
        hostId: host.id,
        strutturaId: struttura1.id,
        unitaId: camere[1].id,
        guestNome: 'Luca',
        guestCognome: 'Verdi',
        guestEmail: 'luca.verdi@email.it',
        guestTelefono: '+39 340 2222222',
        dataArrivo: giorno(0),
        dataPartenza: giorno(3),
        numOspiti: 2,
        stato: 'CONFERMATA',
        prezzoTotale: 240,
        fonte: 'Diretto',
      },
    }),
    // Partenza oggi
    prisma.prenotazione.create({
      data: {
        hostId: host.id,
        strutturaId: struttura1.id,
        unitaId: camere[2].id,
        guestNome: 'Giulia',
        guestCognome: 'Neri',
        guestEmail: 'giulia.neri@email.it',
        dataArrivo: giorno(-3),
        dataPartenza: giorno(0),
        numOspiti: 3,
        stato: 'COMPLETATA',
        prezzoTotale: 330,
        fonte: 'Email',
      },
    }),
    // Prenotazione futura
    prisma.prenotazione.create({
      data: {
        hostId: host.id,
        strutturaId: struttura1.id,
        unitaId: camere[3].id,
        guestNome: 'Roberto',
        guestCognome: 'Ferrari',
        guestEmail: 'roberto.ferrari@email.it',
        guestTelefono: '+39 340 4444444',
        dataArrivo: giorno(5),
        dataPartenza: giorno(8),
        numOspiti: 2,
        stato: 'CONFERMATA',
        prezzoTotale: 450,
        fonte: 'Web',
      },
    }),
    // Richiesta in attesa
    prisma.prenotazione.create({
      data: {
        hostId: host.id,
        strutturaId: struttura1.id,
        unitaId: camere[4].id,
        guestNome: 'Francesca',
        guestCognome: 'Colombo',
        guestEmail: 'francesca.colombo@email.it',
        dataArrivo: giorno(10),
        dataPartenza: giorno(12),
        numOspiti: 2,
        stato: 'RICHIESTA',
        prezzoTotale: 130,
        fonte: 'Web',
      },
    }),
    // Prenotazione annullata
    prisma.prenotazione.create({
      data: {
        hostId: host.id,
        strutturaId: struttura2.id,
        unitaId: camere2[0].id,
        guestNome: 'Stefano',
        guestCognome: 'Russo',
        guestEmail: 'stefano.russo@email.it',
        dataArrivo: giorno(2),
        dataPartenza: giorno(5),
        numOspiti: 4,
        stato: 'ANNULLATA',
        prezzoTotale: 360,
        fonte: 'Diretto',
      },
    }),
    // Soggiorno lungo struttura 2
    prisma.prenotazione.create({
      data: {
        hostId: host.id,
        strutturaId: struttura2.id,
        unitaId: camere2[1].id,
        guestNome: 'Maria',
        guestCognome: 'Esposito',
        guestEmail: 'maria.esposito@email.it',
        guestTelefono: '+39 340 7777777',
        dataArrivo: giorno(-2),
        dataPartenza: giorno(5),
        numOspiti: 2,
        stato: 'CONFERMATA',
        prezzoTotale: 700,
        fonte: 'Tel',
      },
    }),
    // Prenotazione passata (per report)
    prisma.prenotazione.create({
      data: {
        hostId: host.id,
        strutturaId: struttura1.id,
        unitaId: camere[0].id,
        guestNome: 'Giovanni',
        guestCognome: 'Marino',
        guestEmail: 'giovanni.marino@email.it',
        dataArrivo: giorno(-15),
        dataPartenza: giorno(-12),
        numOspiti: 2,
        stato: 'COMPLETATA',
        prezzoTotale: 270,
        fonte: 'Web',
      },
    }),
    prisma.prenotazione.create({
      data: {
        hostId: host.id,
        strutturaId: struttura2.id,
        unitaId: camere2[0].id,
        guestNome: 'Elena',
        guestCognome: 'Ricci',
        guestEmail: 'elena.ricci@email.it',
        dataArrivo: giorno(-10),
        dataPartenza: giorno(-7),
        numOspiti: 3,
        stato: 'COMPLETATA',
        prezzoTotale: 360,
        fonte: 'Email',
      },
    }),
    prisma.prenotazione.create({
      data: {
        hostId: host.id,
        strutturaId: struttura1.id,
        unitaId: camere[3].id,
        guestNome: 'Paolo',
        guestCognome: 'Conti',
        guestEmail: 'paolo.conti@email.it',
        dataArrivo: giorno(-20),
        dataPartenza: giorno(-17),
        numOspiti: 2,
        stato: 'COMPLETATA',
        prezzoTotale: 450,
        fonte: 'Diretto',
      },
    }),
  ])
  console.log('✅ Prenotazioni create:', prenotazioni.length)

  // ─── Ospiti CRM ──────────────────────────────────────────────────────
  const ospiti = await Promise.all([
    prisma.ospiteCRM.upsert({
      where: { hostId_email: { hostId: host.id, email: 'anna.bianchi@email.it' } },
      update: {
        nome: 'Anna',
        cognome: 'Bianchi',
        telefono: '+39 340 1111111',
        nazionalita: 'Italiana',
        vip: true,
        numSoggiorni: 3,
        totaleSpeso: 540,
        tags: ['repeater', 'colazione-vegana'],
        note: 'Preferisce piano alto, allergica ai gatti',
      },
      create: {
        hostId: host.id,
        nome: 'Anna',
        cognome: 'Bianchi',
        email: 'anna.bianchi@email.it',
        telefono: '+39 340 1111111',
        nazionalita: 'Italiana',
        vip: true,
        numSoggiorni: 3,
        totaleSpeso: 540,
        tags: ['repeater', 'colazione-vegana'],
        note: 'Preferisce piano alto, allergica ai gatti',
      },
    }),
    prisma.ospiteCRM.upsert({
      where: { hostId_email: { hostId: host.id, email: 'luca.verdi@email.it' } },
      update: {
        nome: 'Luca',
        cognome: 'Verdi',
        telefono: '+39 340 2222222',
        nazionalita: 'Italiana',
        numSoggiorni: 1,
        totaleSpeso: 240,
      },
      create: {
        hostId: host.id,
        nome: 'Luca',
        cognome: 'Verdi',
        email: 'luca.verdi@email.it',
        telefono: '+39 340 2222222',
        nazionalita: 'Italiana',
        numSoggiorni: 1,
        totaleSpeso: 240,
      },
    }),
    prisma.ospiteCRM.upsert({
      where: { hostId_email: { hostId: host.id, email: 'maria.esposito@email.it' } },
      update: {
        nome: 'Maria',
        cognome: 'Esposito',
        telefono: '+39 340 7777777',
        nazionalita: 'Italiana',
        vip: true,
        numSoggiorni: 5,
        totaleSpeso: 2100,
        tags: ['repeater', 'anniversario'],
        preferenze: 'Camera con vista, cuscini extra',
      },
      create: {
        hostId: host.id,
        nome: 'Maria',
        cognome: 'Esposito',
        email: 'maria.esposito@email.it',
        telefono: '+39 340 7777777',
        nazionalita: 'Italiana',
        vip: true,
        numSoggiorni: 5,
        totaleSpeso: 2100,
        tags: ['repeater', 'anniversario'],
        preferenze: 'Camera con vista, cuscini extra',
      },
    }),
    prisma.ospiteCRM.upsert({
      where: { hostId_email: { hostId: host.id, email: 'hans.mueller@gmail.de' } },
      update: {
        nome: 'Hans',
        cognome: 'Mueller',
        nazionalita: 'Tedesca',
        lingua: 'de',
        numSoggiorni: 2,
        totaleSpeso: 600,
        tags: ['international'],
      },
      create: {
        hostId: host.id,
        nome: 'Hans',
        cognome: 'Mueller',
        email: 'hans.mueller@gmail.de',
        nazionalita: 'Tedesca',
        lingua: 'de',
        numSoggiorni: 2,
        totaleSpeso: 600,
        tags: ['international'],
      },
    }),
  ])
  console.log('✅ Ospiti CRM create/update:', ospiti.length)

  // ─── Eventi ──────────────────────────────────────────────────────────
  const eventi = await Promise.all([
    prisma.evento.create({
      data: {
        hostId: host.id,
        titolo: 'Sagra del Vino Nobile',
        descrizione: 'Degustazione e festa del Vino Nobile di Montepulciano con produttori locali',
        categoria: 'FOOD',
        stato: 'APPROVATO',
        dataInizio: giorno(14),
        dataFine: giorno(16),
        orario: '18:00 - 24:00',
        luogo: 'Piazza Grande',
        citta: 'Montepulciano',
        regione: 'Toscana',
        indirizzo: 'Piazza Grande 1',
        prezzo: '€15 calice incluso',
        visualizzazioni: 1250,
        click: 340,
      },
    }),
    prisma.evento.create({
      data: {
        hostId: host.id,
        titolo: 'Concerto Jazz al Tramonto',
        descrizione: 'Jazz dal vivo nella terrazza panoramica con aperitivo toscano',
        categoria: 'MUSICA',
        stato: 'APPROVATO',
        dataInizio: giorno(7),
        dataFine: giorno(7),
        orario: '19:30',
        luogo: 'Terrazza Panoramica',
        citta: 'Pienza',
        regione: 'Toscana',
        prezzo: 'Gratuito',
        visualizzazioni: 820,
        click: 195,
      },
    }),
    prisma.evento.create({
      data: {
        hostId: host.id,
        titolo: 'Mercato dell\'Antiquariato',
        descrizione: 'Mercatino mensile di antiquariato e artigianato nel centro storico',
        categoria: 'FIERA',
        stato: 'IN_ATTESA',
        dataInizio: giorno(21),
        dataFine: giorno(21),
        orario: '09:00 - 18:00',
        luogo: 'Centro Storico',
        citta: 'Montepulciano',
        regione: 'Toscana',
        prezzo: 'Ingresso libero',
        visualizzazioni: 430,
        click: 85,
      },
    }),
  ])
  console.log('✅ Eventi creati:', eventi.length)

  // ─── Pacchetti ───────────────────────────────────────────────────────
  const pacchetti = await Promise.all([
    prisma.pacchetto.create({
      data: {
        hostId: host.id,
        strutturaId: struttura1.id,
        eventoId: eventi[0].id,
        nome: 'Weekend Vino Nobile',
        descrizione: 'Due notti al B&B Il Poggio con ingresso alla Sagra del Vino Nobile',
        notti: 2,
        numOspiti: 2,
        prezzo: 220,
        prezzoOriginale: 280,
        incluso: [
          '2 notti in camera doppia',
          'Colazione toscana ogni mattina',
          '2 ingressi Sagra del Vino Nobile',
          'Calice e tasca degustazione inclusi',
          'Parcheggio gratuito',
        ],
        attivo: true,
        dataInizio: giorno(12),
        dataFine: giorno(17),
      },
    }),
    prisma.pacchetto.create({
      data: {
        hostId: host.id,
        strutturaId: struttura2.id,
        eventoId: eventi[1].id,
        nome: 'Jazz & Relax in Val d\'Orcia',
        descrizione: 'Serata jazz con soggiorno in agriturismo e cena tipica',
        notti: 1,
        numOspiti: 2,
        prezzo: 160,
        prezzoOriginale: 200,
        incluso: [
          '1 notte in camera doppia',
          'Cena tipica toscana',
          'Accesso concerto jazz',
          'Aperitivo al tramonto',
          'Late checkout ore 12:00',
        ],
        attivo: true,
        dataInizio: giorno(6),
        dataFine: giorno(8),
      },
    }),
    prisma.pacchetto.create({
      data: {
        hostId: host.id,
        strutturaId: struttura1.id,
        nome: 'Settimana in Val d\'Orcia',
        descrizione: 'Una settimana di relax tra le colline della Val d\'Orcia',
        eventoEsterno: 'Festival della Val d\'Orcia',
        notti: 7,
        numOspiti: 2,
        prezzo: 550,
        prezzoOriginale: 700,
        incluso: [
          '7 notti in camera doppia',
          'Colazione inclusa',
          'Tour guidato borghi medievali',
          'Degustazione Brunello di Montalcino',
          'Ingresso terme naturali',
          'Trasferimenti inclusi',
        ],
        attivo: true,
        dataInizio: giorno(20),
        dataFine: giorno(30),
      },
    }),
  ])
  console.log('✅ Pacchetti creati:', pacchetti.length)

  // ─── Notifiche di test ───────────────────────────────────────────────
  await Promise.all([
    prisma.notifica.create({
      data: {
        hostId: host.id,
        tipo: 'prenotazione',
        titolo: 'Nuova prenotazione',
        messaggio: 'Luca Verdi ha prenotato Camera Lavanda per 3 notti',
        letta: false,
        linkUrl: `/host/prenotazioni/${prenotazioni[1].id}`,
      },
    }),
    prisma.notifica.create({
      data: {
        hostId: host.id,
        tipo: 'prenotazione',
        titolo: 'Richiesta in attesa',
        messaggio: 'Francesca Colombo ha richiesto Camera Cipresso',
        letta: false,
        linkUrl: `/host/prenotazioni/${prenotazioni[4].id}`,
      },
    }),
    prisma.notifica.create({
      data: {
        hostId: host.id,
        tipo: 'checkin',
        titolo: 'Check-in completato',
        messaggio: 'Anna Bianchi ha completato il self check-in',
        letta: true,
      },
    }),
    prisma.notifica.create({
      data: {
        hostId: host.id,
        tipo: 'sistema',
        titolo: 'Benvenuto su Otium Week!',
        messaggio: 'Il tuo account è attivo. Inizia a gestire le tue prenotazioni.',
        letta: true,
      },
    }),
  ])
  console.log('✅ Notifiche create')

  // ─── Segnalazione manutenzione ──────────────────────────────────────
  await prisma.segnalazioneManutenzione.create({
    data: {
      hostId: host.id,
      strutturaId: struttura1.id,
      unitaId: camere[2].id,
      titolo: 'Perdita rubinetto bagno',
      descrizione: 'Il rubinetto del lavandino gocciola, da verificare guarnizione',
      categoria: 'IDRAULICA',
      stato: 'APERTA',
      priorita: 'NORMALE',
      assegnatoA: 'Mario Idraulico',
      costoStimato: 80,
    },
  })
  console.log('✅ Segnalazione manutenzione creata')

  // ─── Task HK ─────────────────────────────────────────────────────────
  await Promise.all([
    prisma.taskHK.create({
      data: {
        unitaId: camere[2].id,
        hostId: host.id,
        tipo: 'PULIZIA',
        descrizione: 'Pulizia completa dopo checkout Neri',
        priorita: 'ALTA',
        assegnatoA: 'Lucia',
        dataScadenza: giorno(0),
      },
    }),
    prisma.taskHK.create({
      data: {
        unitaId: camere2[2].id,
        hostId: host.id,
        tipo: 'CAMBIO_BIANCHERIA',
        descrizione: 'Cambio lenzuola e asciugamani',
        priorita: 'NORMALE',
        assegnatoA: 'Lucia',
        dataScadenza: giorno(0),
      },
    }),
  ])
  console.log('✅ Task HK creati')

  // ─── SPA: Terapisti ──────────────────────────────────────────────────
  const terapisti = await Promise.all([
    prisma.terapistaSpa.create({
      data: {
        hostId: host.id,
        nome: 'Chiara',
        cognome: 'Fontana',
        email: 'chiara.fontana@email.it',
        telefono: '+39 345 1112233',
        colore: '#6366f1',
        specializzazioni: ['massaggio', 'riflessologia', 'linfodrenaggio'],
        attivo: true,
        profiloPublico: true,
        bio: 'Massaggiatrice olistica certificata con 10 anni di esperienza. Specializzata in tecniche orientali e massaggio sportivo.',
      },
    }),
    prisma.terapistaSpa.create({
      data: {
        hostId: host.id,
        nome: 'Sara',
        cognome: 'Bellini',
        email: 'sara.bellini@email.it',
        telefono: '+39 345 4445566',
        colore: '#ec4899',
        specializzazioni: ['estetica', 'viso', 'corpo'],
        attivo: true,
        profiloPublico: true,
        bio: 'Estetista professionista specializzata in trattamenti viso anti-age e rituali corpo con prodotti biologici toscani.',
      },
    }),
    prisma.terapistaSpa.create({
      data: {
        hostId: host.id,
        nome: 'Marco',
        cognome: 'De Luca',
        email: 'marco.deluca@email.it',
        colore: '#14b8a6',
        specializzazioni: ['massaggio', 'coppia', 'hot-stone'],
        attivo: true,
        profiloPublico: true,
        bio: 'Fisioterapista e massaggiatore con formazione ayurvedica. Esperto in trattamenti decontratturanti e hot stone.',
      },
    }),
  ])
  console.log('✅ Terapisti SPA creati:', terapisti.length)

  // ─── SPA: Cabine ─────────────────────────────────────────────────────
  const cabine = await Promise.all([
    prisma.cabinaSpa.create({
      data: {
        hostId: host.id,
        nome: 'Cabina Toscana',
        descrizione: 'Cabina singola con lettino riscaldato e musica ambientale',
        colore: '#8b5cf6',
        capacita: 1,
        attiva: true,
      },
    }),
    prisma.cabinaSpa.create({
      data: {
        hostId: host.id,
        nome: 'Suite Coppia Val d\'Orcia',
        descrizione: 'Suite doppia con vasca idromassaggio, cromoterapia e champagne',
        colore: '#f43f5e',
        capacita: 2,
        attiva: true,
      },
    }),
    prisma.cabinaSpa.create({
      data: {
        hostId: host.id,
        nome: 'Grotta del Sale',
        descrizione: 'Stanza del sale rosa dell\'Himalaya per haloterapia',
        colore: '#f59e0b',
        capacita: 4,
        attiva: true,
      },
    }),
  ])
  console.log('✅ Cabine SPA create:', cabine.length)

  // ─── SPA: Trattamenti ────────────────────────────────────────────────
  const trattamenti = await Promise.all([
    // MASSAGGIO
    prisma.trattamentoSpa.create({
      data: {
        hostId: host.id,
        nome: 'Massaggio rilassante toscano',
        categoria: 'MASSAGGIO',
        durata: 50,
        prezzo: 70,
        descrizione: 'Massaggio rilassante con oli essenziali di lavanda e rosmarino delle colline toscane. Ideale per sciogliere tensioni e ritrovare il benessere.',
        colore: '#6366f1',
        attivo: true,
        prenotabileOnline: true,
      },
    }),
    prisma.trattamentoSpa.create({
      data: {
        hostId: host.id,
        nome: 'Massaggio decontratturante sportivo',
        categoria: 'MASSAGGIO',
        durata: 60,
        prezzo: 85,
        descrizione: 'Massaggio profondo mirato al rilascio delle contratture muscolari. Consigliato dopo attività sportiva o periodi di stress.',
        colore: '#3b82f6',
        attivo: true,
        prenotabileOnline: true,
      },
    }),
    prisma.trattamentoSpa.create({
      data: {
        hostId: host.id,
        nome: 'Hot Stone Massage',
        categoria: 'MASSAGGIO',
        durata: 70,
        prezzo: 95,
        descrizione: 'Massaggio con pietre calde vulcaniche. Il calore penetra in profondità per un rilassamento totale di corpo e mente.',
        colore: '#ef4444',
        attivo: true,
        prenotabileOnline: true,
      },
    }),
    prisma.trattamentoSpa.create({
      data: {
        hostId: host.id,
        nome: 'Massaggio di coppia',
        categoria: 'COPPIA',
        durata: 60,
        prezzo: 150,
        descrizione: 'Esperienza romantica per due nella suite coppia con candele, musica e champagne.',
        colore: '#f43f5e',
        attivo: true,
        prenotabileOnline: true,
      },
    }),
    // VISO
    prisma.trattamentoSpa.create({
      data: {
        hostId: host.id,
        nome: 'Trattamento viso anti-age',
        categoria: 'VISO',
        durata: 45,
        prezzo: 65,
        descrizione: 'Trattamento rigenerante con acido ialuronico e vitamina C. Riduce i segni del tempo e restituisce luminosità.',
        colore: '#a855f7',
        attivo: true,
        prenotabileOnline: true,
      },
    }),
    prisma.trattamentoSpa.create({
      data: {
        hostId: host.id,
        nome: 'Pulizia viso profonda',
        categoria: 'VISO',
        durata: 60,
        prezzo: 55,
        descrizione: 'Pulizia del viso con vapore, estratzione e maschera purificante all\'argilla verde.',
        colore: '#22c55e',
        attivo: true,
        prenotabileOnline: true,
      },
    }),
    // CORPO
    prisma.trattamentoSpa.create({
      data: {
        hostId: host.id,
        nome: 'Scrub corpo al sale marino',
        categoria: 'CORPO',
        durata: 40,
        prezzo: 50,
        descrizione: 'Esfoliazione completa del corpo con sale marino e olio d\'oliva toscano. Pelle setosa e rigenerata.',
        colore: '#06b6d4',
        attivo: true,
        prenotabileOnline: true,
      },
    }),
    prisma.trattamentoSpa.create({
      data: {
        hostId: host.id,
        nome: 'Impacco fango termale',
        categoria: 'CORPO',
        durata: 50,
        prezzo: 60,
        descrizione: 'Impacco detossinante con fango delle terme di Saturnia. Azione drenante e rimineralizzante.',
        colore: '#84cc16',
        attivo: true,
        prenotabileOnline: true,
      },
    }),
    // RITUALI
    prisma.trattamentoSpa.create({
      data: {
        hostId: host.id,
        nome: 'Rituale hammam',
        categoria: 'RITUALI',
        durata: 90,
        prezzo: 110,
        descrizione: 'Esperienza hammam completa: bagno di vapore, scrub con sapone nero, massaggio con olio di argan.',
        colore: '#f97316',
        attivo: true,
        prenotabileOnline: true,
      },
    }),
    // BAGNI
    prisma.trattamentoSpa.create({
      data: {
        hostId: host.id,
        nome: 'Bagno di fieno alpino',
        categoria: 'BAGNI',
        durata: 30,
        prezzo: 40,
        descrizione: 'Antica tradizione alpina: immersione in erbe di montagna fermentate. Effetto detox e rilassante.',
        colore: '#65a30d',
        attivo: true,
        prenotabileOnline: true,
      },
    }),
  ])
  console.log('✅ Trattamenti SPA creati:', trattamenti.length)

  // ─── SPA: Percorsi benessere ─────────────────────────────────────────
  const percorso1 = await prisma.percorsoBenessere.create({
    data: {
      hostId: host.id,
      nome: 'Percorso Relax Toscano',
      descrizione: 'Un viaggio sensoriale tra i profumi della Toscana: scrub, impacco e massaggio rilassante.',
      prezzo: 160,
      durataMinuti: 140,
      attivo: true,
      colore: '#6366f1',
      passaggi: {
        create: [
          { trattamentoId: trattamenti[6].id, ordine: 1, durata: 40 },  // Scrub corpo
          { trattamentoId: trattamenti[7].id, ordine: 2, durata: 50 },  // Impacco fango
          { trattamentoId: trattamenti[0].id, ordine: 3, durata: 50 },  // Massaggio rilassante
        ],
      },
    },
  })

  const percorso2 = await prisma.percorsoBenessere.create({
    data: {
      hostId: host.id,
      nome: 'Weekend della Coppia',
      descrizione: 'Esperienza romantica completa: bagno, trattamento viso e massaggio di coppia nella suite privata.',
      prezzo: 280,
      durataMinuti: 135,
      attivo: true,
      colore: '#f43f5e',
      passaggi: {
        create: [
          { trattamentoId: trattamenti[9].id, ordine: 1, durata: 30 },  // Bagno fieno
          { trattamentoId: trattamenti[4].id, ordine: 2, durata: 45 },  // Viso anti-age
          { trattamentoId: trattamenti[3].id, ordine: 3, durata: 60 },  // Massaggio coppia
        ],
      },
    },
  })

  const percorso3 = await prisma.percorsoBenessere.create({
    data: {
      hostId: host.id,
      nome: 'Percorso Detox Intensivo',
      descrizione: 'Purificazione totale: hammam, scrub e impacco detossinante per rigenerarsi dalla testa ai piedi.',
      prezzo: 190,
      durataMinuti: 180,
      attivo: true,
      colore: '#14b8a6',
      passaggi: {
        create: [
          { trattamentoId: trattamenti[8].id, ordine: 1, durata: 90 },  // Rituale hammam
          { trattamentoId: trattamenti[6].id, ordine: 2, durata: 40 },  // Scrub corpo
          { trattamentoId: trattamenti[7].id, ordine: 3, durata: 50 },  // Impacco fango
        ],
      },
    },
  })
  console.log('✅ Percorsi benessere creati: 3')

  // ─── SPA: Disponibilità terapisti ────────────────────────────────────
  // Chiara: lun-ven 9-18, sab 9-13
  const dispTerapisti = []
  for (let g = 0; g <= 4; g++) {
    dispTerapisti.push(
      prisma.disponibilitaTerapista.create({
        data: { hostId: host.id, terapistaId: terapisti[0].id, tipo: 'SETTIMANALE', giorno: g, orarioInizio: '09:00', orarioFine: '18:00' },
      }),
    )
  }
  dispTerapisti.push(
    prisma.disponibilitaTerapista.create({
      data: { hostId: host.id, terapistaId: terapisti[0].id, tipo: 'SETTIMANALE', giorno: 5, orarioInizio: '09:00', orarioFine: '13:00' },
    }),
  )
  // Sara: lun-sab 10-19
  for (let g = 0; g <= 5; g++) {
    dispTerapisti.push(
      prisma.disponibilitaTerapista.create({
        data: { hostId: host.id, terapistaId: terapisti[1].id, tipo: 'SETTIMANALE', giorno: g, orarioInizio: '10:00', orarioFine: '19:00' },
      }),
    )
  }
  // Marco: mer-dom 9-17
  for (let g = 2; g <= 6; g++) {
    dispTerapisti.push(
      prisma.disponibilitaTerapista.create({
        data: { hostId: host.id, terapistaId: terapisti[2].id, tipo: 'SETTIMANALE', giorno: g, orarioInizio: '09:00', orarioFine: '17:00' },
      }),
    )
  }
  await Promise.all(dispTerapisti)
  console.log('✅ Disponibilità terapisti create:', dispTerapisti.length)

  // ─── SPA: Appuntamenti demo ──────────────────────────────────────────
  const ora = (offsetGiorni: number, ore: number, minuti: number) => {
    const d = new Date(oggi)
    d.setDate(d.getDate() + offsetGiorni)
    d.setHours(ore, minuti, 0, 0)
    return d
  }

  const appuntamenti = await Promise.all([
    // Oggi — mattina
    prisma.appuntamentoSpa.create({
      data: {
        hostId: host.id,
        guestNome: 'Anna', guestCognome: 'Bianchi',
        guestEmail: 'anna.bianchi@email.it',
        terapistaId: terapisti[0].id,
        cabinaId: cabine[0].id,
        trattamentoId: trattamenti[0].id, // Massaggio rilassante
        dataOra: ora(0, 10, 0),
        durata: 50,
        prezzoTotale: 70,
        stato: 'CONFERMATO',
        note: 'Ospite della Camera Girasole — preferisce olio lavanda',
      },
    }),
    // Oggi — pomeriggio
    prisma.appuntamentoSpa.create({
      data: {
        hostId: host.id,
        guestNome: 'Luca', guestCognome: 'Verdi',
        guestEmail: 'luca.verdi@email.it',
        terapistaId: terapisti[1].id,
        cabinaId: cabine[0].id,
        trattamentoId: trattamenti[4].id, // Viso anti-age
        dataOra: ora(0, 14, 30),
        durata: 45,
        prezzoTotale: 65,
        stato: 'CONFERMATO',
      },
    }),
    // Oggi — coppia nel pomeriggio
    prisma.appuntamentoSpa.create({
      data: {
        hostId: host.id,
        guestNome: 'Maria', guestCognome: 'Esposito',
        guestEmail: 'maria.esposito@email.it',
        guestTelefono: '+39 340 7777777',
        terapistaId: terapisti[2].id,
        cabinaId: cabine[1].id,
        trattamentoId: trattamenti[3].id, // Massaggio coppia
        dataOra: ora(0, 16, 0),
        durata: 60,
        prezzoTotale: 150,
        stato: 'CONFERMATO',
        note: 'Anniversario matrimonio — preparare champagne',
      },
    }),
    // Domani — mattina piena
    prisma.appuntamentoSpa.create({
      data: {
        hostId: host.id,
        guestNome: 'Roberto', guestCognome: 'Ferrari',
        guestEmail: 'roberto.ferrari@email.it',
        terapistaId: terapisti[0].id,
        cabinaId: cabine[0].id,
        trattamentoId: trattamenti[2].id, // Hot Stone
        dataOra: ora(1, 9, 30),
        durata: 70,
        prezzoTotale: 95,
        stato: 'CONFERMATO',
      },
    }),
    prisma.appuntamentoSpa.create({
      data: {
        hostId: host.id,
        guestNome: 'Francesca', guestCognome: 'Colombo',
        guestEmail: 'francesca.colombo@email.it',
        terapistaId: terapisti[1].id,
        cabinaId: cabine[0].id,
        trattamentoId: trattamenti[5].id, // Pulizia viso
        dataOra: ora(1, 10, 0),
        durata: 60,
        prezzoTotale: 55,
        stato: 'CONFERMATO',
      },
    }),
    // Domani — pomeriggio hammam
    prisma.appuntamentoSpa.create({
      data: {
        hostId: host.id,
        guestNome: 'Hans', guestCognome: 'Mueller',
        guestEmail: 'hans.mueller@gmail.de',
        terapistaId: terapisti[2].id,
        cabinaId: cabine[2].id,
        trattamentoId: trattamenti[8].id, // Rituale hammam
        dataOra: ora(1, 15, 0),
        durata: 90,
        prezzoTotale: 110,
        stato: 'CONFERMATO',
        note: 'Ospite tedesco — comunicare in inglese',
      },
    }),
    // Dopodomani — percorso
    prisma.appuntamentoSpa.create({
      data: {
        hostId: host.id,
        guestNome: 'Elena', guestCognome: 'Ricci',
        guestEmail: 'elena.ricci@email.it',
        terapistaId: terapisti[0].id,
        cabinaId: cabine[0].id,
        percorsoId: percorso1.id, // Percorso Relax Toscano
        dataOra: ora(2, 10, 0),
        durata: 140,
        prezzoTotale: 160,
        stato: 'PRENOTATO',
      },
    }),
    // Tra 3 giorni — coppia percorso
    prisma.appuntamentoSpa.create({
      data: {
        hostId: host.id,
        guestNome: 'Paolo', guestCognome: 'Conti',
        guestEmail: 'paolo.conti@email.it',
        terapistaId: terapisti[2].id,
        cabinaId: cabine[1].id,
        percorsoId: percorso2.id, // Weekend della Coppia
        dataOra: ora(3, 11, 0),
        durata: 135,
        prezzoTotale: 280,
        stato: 'PRENOTATO',
        note: 'Prepara candele e fiori nella suite',
      },
    }),
    // Passato — completati (per report)
    prisma.appuntamentoSpa.create({
      data: {
        hostId: host.id,
        guestNome: 'Giovanni', guestCognome: 'Marino',
        guestEmail: 'giovanni.marino@email.it',
        terapistaId: terapisti[0].id,
        cabinaId: cabine[0].id,
        trattamentoId: trattamenti[1].id, // Decontratturante
        dataOra: ora(-2, 11, 0),
        durata: 60,
        prezzoTotale: 85,
        stato: 'COMPLETATO',
      },
    }),
    prisma.appuntamentoSpa.create({
      data: {
        hostId: host.id,
        guestNome: 'Anna', guestCognome: 'Bianchi',
        guestEmail: 'anna.bianchi@email.it',
        terapistaId: terapisti[1].id,
        cabinaId: cabine[0].id,
        trattamentoId: trattamenti[6].id, // Scrub corpo
        dataOra: ora(-3, 14, 0),
        durata: 40,
        prezzoTotale: 50,
        stato: 'COMPLETATO',
      },
    }),
    prisma.appuntamentoSpa.create({
      data: {
        hostId: host.id,
        guestNome: 'Stefano', guestCognome: 'Russo',
        guestEmail: 'stefano.russo@email.it',
        terapistaId: terapisti[2].id,
        cabinaId: cabine[2].id,
        trattamentoId: trattamenti[9].id, // Bagno fieno
        dataOra: ora(-1, 10, 0),
        durata: 30,
        prezzoTotale: 40,
        stato: 'COMPLETATO',
      },
    }),
    // Annullato (per statistiche)
    prisma.appuntamentoSpa.create({
      data: {
        hostId: host.id,
        guestNome: 'Giulia', guestCognome: 'Neri',
        guestEmail: 'giulia.neri@email.it',
        terapistaId: terapisti[0].id,
        cabinaId: cabine[0].id,
        trattamentoId: trattamenti[0].id,
        dataOra: ora(-1, 15, 0),
        durata: 50,
        prezzoTotale: 70,
        stato: 'ANNULLATO',
      },
    }),
  ])
  console.log('✅ Appuntamenti SPA creati:', appuntamenti.length)

  // ─── Riepilogo ───────────────────────────────────────────────────────
  console.log('\n📋 RIEPILOGO SEED')
  console.log('─────────────────────────────────────────')
  console.log('Admin:    admin@otiumweek.it / Otium2025!')
  console.log('Host:     host@otiumweek.it  / Otium2025!')
  console.log(`Struttura 1: ${struttura1.nome} (ID: ${struttura1.id})`)
  console.log(`Struttura 2: ${struttura2.nome} (ID: ${struttura2.id})`)
  console.log(`Pacchetti pubblici: http://localhost:3000/book/${struttura1.id}/pacchetti`)
  console.log(`Booking SPA:        http://localhost:3000/book/${struttura1.id}/spa`)
  console.log(`Terapisti: ${terapisti.map(t => `${t.nome} ${t.cognome}`).join(', ')}`)
  console.log(`Cabine: ${cabine.length} | Trattamenti: ${trattamenti.length} | Percorsi: 3`)
  console.log(`Appuntamenti demo: ${appuntamenti.length} (oggi/domani/passati)`)
  console.log('─────────────────────────────────────────')
}

main()
  .catch((e) => {
    console.error('❌ Seed fallito:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
