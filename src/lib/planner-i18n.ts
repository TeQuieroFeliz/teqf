export type Lang = 'it' | 'en' | 'es';

export const LOCALE_MAP: Record<Lang, string> = {
  it: 'it-IT',
  en: 'en-US',
  es: 'es-MX',
};

export type DocTranslations = {
  submitted: string;
  // sections
  eventDetails: string;
  daySection: (n: number, date: string) => string;
  plannerSection: string;
  furnitureSection: string;
  flowersSection: string;
  totalSection: string;
  notesSection: string;
  // labels
  eventCode: string;
  client: string;
  city: string;
  numDays: (n: number) => string;
  description: string;
  address: string;
  setup: string;
  breakdown: string;
  supplierAccess: string;
  documents: string;
  regulationAttached: string;
  layoutAttached: (n: number) => string;
  name: string;
  email: string;
  // table headers
  item: string;
  category: string;
  qty: string;
  unitPrice: string;
  total: string;
  furnitureSubtotal: string;
  flower: string;
  quantity: string;
  flowersSubtotal: string;
  // custom items
  customItemsSection: string;
  customImageAttached: string;
  customNoDescription: string;
  // footer
  footerText: (date: string) => string;
  // email extras
  newEventReceived: string;
  venue: string;
  noFurnitureSelected: string;
  noFlowersSelected: string;
  subtotalFurniture: string;
  subtotalFlowers: string;
  estimatedTotal: string;
  generalNotes: string;
};

export const DT: Record<Lang, DocTranslations> = {
  it: {
    submitted: 'INVIATO',
    eventDetails: 'Dettagli Evento',
    daySection: (n, date) => `Giorno ${n} — ${date}`,
    plannerSection: 'Planner',
    furnitureSection: 'Mobiliario Selezionato',
    flowersSection: 'Fiori Selezionati',
    totalSection: 'TOTALE STIMATO',
    notesSection: 'Note Generali',
    eventCode: 'Codice Evento',
    client: 'Cliente',
    city: 'Città',
    numDays: (n) => `${n} ${n === 1 ? 'giorno' : 'giorni'}`,
    description: 'Descrizione',
    address: 'INDIRIZZO',
    setup: 'Montaggio',
    breakdown: 'Smontaggio',
    supplierAccess: 'Accesso Fornitori',
    documents: 'DOCUMENTI',
    regulationAttached: '• Regolamento Fornitori: allegato',
    layoutAttached: (n) => `• Layout${n > 0 ? ` ${n}` : ''}: allegato`,
    name: 'Nome',
    email: 'Email',
    item: 'Articolo',
    category: 'Categoria',
    qty: 'Qtà',
    unitPrice: 'Prezzo unit.',
    total: 'Totale',
    furnitureSubtotal: 'Subtotale Mobiliario:',
    flower: 'Fiore',
    quantity: 'Quantità',
    flowersSubtotal: 'Subtotale Fiori:',
    customItemsSection: 'IDEE & ELEMENTI PERSONALIZZATI',
    customImageAttached: '[Immagine allegata]',
    customNoDescription: '(elemento senza descrizione)',
    footerText: (date) => `Te Quiero Feliz — Documento riservato — ${date}`,
    newEventReceived: 'Nuovo Evento Ricevuto',
    venue: 'Venue',
    noFurnitureSelected: 'Nessun mobile selezionato.',
    noFlowersSelected: 'Nessun fiore selezionato.',
    subtotalFurniture: 'Subtotale',
    subtotalFlowers: 'Subtotale',
    estimatedTotal: 'Totale Stimato',
    generalNotes: 'Note Generali',
  },
  en: {
    submitted: 'SUBMITTED',
    eventDetails: 'Event Details',
    daySection: (n, date) => `Day ${n} — ${date}`,
    plannerSection: 'Planner',
    furnitureSection: 'Selected Furniture',
    flowersSection: 'Selected Flowers',
    totalSection: 'ESTIMATED TOTAL',
    notesSection: 'General Notes',
    eventCode: 'Event Code',
    client: 'Client',
    city: 'City',
    numDays: (n) => `${n} ${n === 1 ? 'day' : 'days'}`,
    description: 'Description',
    address: 'ADDRESS',
    setup: 'Setup',
    breakdown: 'Breakdown',
    supplierAccess: 'Supplier Access',
    documents: 'DOCUMENTS',
    regulationAttached: '• Supplier Regulations: attached',
    layoutAttached: (n) => `• Layout${n > 0 ? ` ${n}` : ''}: attached`,
    name: 'Name',
    email: 'Email',
    item: 'Item',
    category: 'Category',
    qty: 'Qty',
    unitPrice: 'Unit price',
    total: 'Total',
    furnitureSubtotal: 'Furniture subtotal:',
    flower: 'Flower',
    quantity: 'Quantity',
    flowersSubtotal: 'Flowers subtotal:',
    customItemsSection: 'IDEAS & CUSTOM ELEMENTS',
    customImageAttached: '[Image attached]',
    customNoDescription: '(element without description)',
    footerText: (date) => `Te Quiero Feliz — Confidential document — ${date}`,
    newEventReceived: 'New Event Received',
    venue: 'Venue',
    noFurnitureSelected: 'No furniture selected.',
    noFlowersSelected: 'No flowers selected.',
    subtotalFurniture: 'Subtotal',
    subtotalFlowers: 'Subtotal',
    estimatedTotal: 'Estimated Total',
    generalNotes: 'General Notes',
  },
  es: {
    submitted: 'ENVIADO',
    eventDetails: 'Detalles del Evento',
    daySection: (n, date) => `Día ${n} — ${date}`,
    plannerSection: 'Planner',
    furnitureSection: 'Mobiliario Seleccionado',
    flowersSection: 'Flores Seleccionadas',
    totalSection: 'TOTAL ESTIMADO',
    notesSection: 'Notas Generales',
    eventCode: 'Código de Evento',
    client: 'Cliente',
    city: 'Ciudad',
    numDays: (n) => `${n} ${n === 1 ? 'día' : 'días'}`,
    description: 'Descripción',
    address: 'DIRECCIÓN',
    setup: 'Montaje',
    breakdown: 'Desmontaje',
    supplierAccess: 'Acceso de Proveedores',
    documents: 'DOCUMENTOS',
    regulationAttached: '• Reglamento de Proveedores: adjunto',
    layoutAttached: (n) => `• Layout${n > 0 ? ` ${n}` : ''}: adjunto`,
    name: 'Nombre',
    email: 'Email',
    item: 'Artículo',
    category: 'Categoría',
    qty: 'Cant.',
    unitPrice: 'Precio unit.',
    total: 'Total',
    furnitureSubtotal: 'Subtotal Mobiliario:',
    flower: 'Flor',
    quantity: 'Cantidad',
    flowersSubtotal: 'Subtotal Flores:',
    customItemsSection: 'IDEAS & ELEMENTOS PERSONALIZADOS',
    customImageAttached: '[Imagen adjunta]',
    customNoDescription: '(elemento sin descripción)',
    footerText: (date) => `Te Quiero Feliz — Documento confidencial — ${date}`,
    newEventReceived: 'Nuevo Evento Recibido',
    venue: 'Venue',
    noFurnitureSelected: 'Sin mobiliario seleccionado.',
    noFlowersSelected: 'Sin flores seleccionadas.',
    subtotalFurniture: 'Subtotal',
    subtotalFlowers: 'Subtotal',
    estimatedTotal: 'Total Estimado',
    generalNotes: 'Notas Generales',
  },
};

export const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: 'it', label: 'IT' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
];

export type Translations = {
  // calendar
  monthsFull: string[];
  monthsShort: string[];
  days: string[];
  daySelected: string;
  daysSelected: string;
  // date format
  dateMonths: string[];

  // nav / header
  myEvents: string;
  newEvent: string;
  editEvent: string;
  saveDraft: string;
  send: string;
  downloadPdf: string;

  // section titles
  eventDetails: string;
  daysVenue: string;
  furnitureCatalog: (city: string) => string;
  flowerCatalog: string;
  generalNotes: string;
  estimatedTotal: string;

  // event details form
  eventCode: string;
  eventCodePlaceholder: string;
  eventCodeHint: string;
  clientName: string;
  clientNamePlaceholder: string;
  city: string;
  cityPlaceholder: string;

  // calendar section
  clickDates: string;
  selectDaysHint: string;

  // day card
  eventDescription: string;
  eventDescriptionPlaceholder: string;
  eventDescriptionEmpty: string;
  venuePlaceholder: string;
  notes: string;
  notesPlaceholder: string;
  logistics: string;
  setup: string;
  breakdown: string;
  supplierAccess: string;
  supplierRegulations: string;
  regulationsUploaded: string;
  uploading: string;
  uploadDoc: string;
  addLayout: string;
  layoutLabel: (n: number) => string;
  layoutItem: (i: number) => string;

  // catalog
  all: string;
  noFurniture: (city: string) => string;
  noFlowers: string;
  furnitureSelection: (n: number) => string;
  flowersSelection: (n: number) => string;
  furnitureSubtotal: string;
  flowersSubtotal: string;

  // notes section
  notesMainPlaceholder: string;

  // footer buttons
  saveAsDraft: string;
  sendToTqf: string;

  // toasts
  enterEventCode: string;
  selectOneDay: string;
  eventSent: string;
  draftSaved: string;
  saveError: string;
  regulationUploaded: string;
  regulationError: string;
  layoutUploaded: (n: number) => string;
  layoutError: string;
  pdfError: string;

  // day card — item count subtitle
  itemsCount: (n: number) => string;

  // custom items section
  customItemsTitle: string;
  add: string;
  customItemsEmptyHint: string;
  addMorePhotos: string;
  uploadPhoto: string;
  imageUploaded: (n: number) => string;
  imageUploadError: string;
  customItemNotePlaceholder: string;

  // dashboard
  yourEvents: string;
  eventCount: (n: number) => string;
  noEventsYet: string;
  noEventsHint: string;
  eventNameless: string;
  clientLabel: string;
  daysCount: (n: number) => string;
  furnitureCount: (n: number) => string;
  flowersCount: (n: number) => string;
  statusDraft: string;
  statusSubmitted: string;
  edit: string;
  logout: string;
  deleteEventConfirm: (name: string) => string;
  eventDeleted: string;
  deleteError: string;
};

export const T: Record<Lang, Translations> = {
  it: {
    monthsFull: ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'],
    monthsShort: ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'],
    days: ['Lu','Ma','Me','Gi','Ve','Sa','Do'],
    daySelected: 'giorno selezionato',
    daysSelected: 'giorni selezionati',
    dateMonths: ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'],

    myEvents: 'I miei eventi',
    newEvent: 'Nuovo Evento',
    editEvent: 'Modifica Evento',
    saveDraft: 'Salva bozza',
    send: 'Invia',
    downloadPdf: 'PDF',

    eventDetails: 'Dettagli Evento',
    daysVenue: 'Giorni & Venue',
    furnitureCatalog: (city) => `Catalogo Mobili${city ? ` — ${city}` : ''}`,
    flowerCatalog: 'Catalogo Fiori',
    generalNotes: 'Note Generali',
    estimatedTotal: 'Totale Stimato',

    eventCode: 'Codice Evento',
    eventCodePlaceholder: 'es. PS0426CDMX  (iniziali sposa·sposo + mese·anno + città)',
    eventCodeHint: 'Formato suggerito: PS (P=sposa, S=sposo) + 04 (mese) + 26 (anno) + CDMX (città)',
    clientName: 'Nome Cliente',
    clientNamePlaceholder: 'es. Paola & Santiago García',
    city: 'Città',
    cityPlaceholder: 'es. Ciudad de México, Cancún, Roma...',

    clickDates: 'Clicca le date per selezionare i giorni dell\'evento',
    selectDaysHint: 'Seleziona i giorni nel calendario',

    eventDescription: 'Descrizione evento',
    eventDescriptionPlaceholder: 'es. Sangeet, Cerimonia, Ricevimento...',
    eventDescriptionEmpty: 'Descrizione evento non inserita',
    venuePlaceholder: 'es. Sofitel Reforma CDMX',
    notes: 'Note',
    notesPlaceholder: 'es. Ballroom Louvre, piano -1, ingresso laterale...',
    logistics: 'Orari Logistica',
    setup: 'Montaggio',
    breakdown: 'Smontaggio',
    supplierAccess: 'Accesso Fornitori',
    supplierRegulations: 'Regolamento Fornitori',
    regulationsUploaded: 'Regolamento caricato',
    uploading: 'Caricamento...',
    uploadDoc: 'Carica PDF / Documento',
    addLayout: 'Aggiungi Layout',
    layoutLabel: (n) => `Layout (${n} file)`,
    layoutItem: (i) => `Layout ${i + 1}`,

    all: 'Tutti',
    noFurniture: (city) => `Nessun elemento disponibile per ${city || 'questa città'}.`,
    noFlowers: 'Nessun fiore disponibile.',
    furnitureSelection: (n) => `Selezione (${n} ${n === 1 ? 'pezzo' : 'pezzi'})`,
    flowersSelection: (n) => `Selezione (${n} unità)`,
    furnitureSubtotal: 'Subtotale mobili',
    flowersSubtotal: 'Subtotale fiori',

    notesMainPlaceholder: 'Informazioni aggiuntive, richieste speciali, istruzioni per il team...',

    saveAsDraft: 'Salva come bozza',
    sendToTqf: 'Invia a Te Quiero Feliz',

    enterEventCode: 'Inserisci il codice evento.',
    selectOneDay: 'Seleziona almeno un giorno per l\'evento.',
    eventSent: 'Evento inviato!',
    draftSaved: 'Bozza salvata.',
    saveError: 'Errore salvataggio.',
    regulationUploaded: 'Regolamento caricato.',
    regulationError: 'Errore caricamento regolamento.',
    layoutUploaded: (n) => `${n} ${n === 1 ? 'layout caricato' : 'layout caricati'}.`,
    layoutError: 'Errore caricamento layout.',
    pdfError: 'Errore nella generazione del PDF.',

    itemsCount: (n) => `${n} ${n === 1 ? 'articolo' : 'articoli'}`,
    customItemsTitle: 'Idee & Elementi Personalizzati',
    add: 'Aggiungi',
    customItemsEmptyHint: 'Aggiungi foto o note per idee non presenti nel catalogo',
    addMorePhotos: 'Aggiungi foto',
    uploadPhoto: 'Carica foto',
    imageUploaded: (n) => `${n} ${n === 1 ? 'immagine caricata' : 'immagini caricate'}.`,
    imageUploadError: 'Errore caricamento immagine.',
    customItemNotePlaceholder: "Descrivi l'idea, il materiale, il colore, la quantità...",

    yourEvents: 'I tuoi eventi',
    eventCount: (n) => `${n} ${n === 1 ? 'evento' : 'eventi'}`,
    noEventsYet: 'Nessun evento ancora',
    noEventsHint: 'Crea il primo evento per iniziare a pianificare.',
    eventNameless: 'Evento senza nome',
    clientLabel: 'Cliente',
    daysCount: (n) => `${n} ${n === 1 ? 'giorno' : 'giorni'}`,
    furnitureCount: (n) => `${n} ${n === 1 ? 'mobile' : 'mobili'}`,
    flowersCount: (n) => `${n} ${n === 1 ? 'fiore' : 'fiori'}`,
    statusDraft: 'Bozza',
    statusSubmitted: 'Inviato',
    edit: 'Modifica',
    logout: 'Esci',
    deleteEventConfirm: (name) => `Eliminare "${name}"?`,
    eventDeleted: 'Evento eliminato.',
    deleteError: 'Errore eliminazione.',
  },

  en: {
    monthsFull: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    monthsShort: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    days: ['Mo','Tu','We','Th','Fr','Sa','Su'],
    daySelected: 'day selected',
    daysSelected: 'days selected',
    dateMonths: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],

    myEvents: 'My events',
    newEvent: 'New Event',
    editEvent: 'Edit Event',
    saveDraft: 'Save draft',
    send: 'Send',
    downloadPdf: 'PDF',

    eventDetails: 'Event Details',
    daysVenue: 'Days & Venue',
    furnitureCatalog: (city) => `Furniture Catalog${city ? ` — ${city}` : ''}`,
    flowerCatalog: 'Flower Catalog',
    generalNotes: 'General Notes',
    estimatedTotal: 'Estimated Total',

    eventCode: 'Event Code',
    eventCodePlaceholder: 'e.g. PS0426CDMX  (bride·groom initials + month·year + city)',
    eventCodeHint: 'Suggested format: PS (P=bride, S=groom) + 04 (month) + 26 (year) + CDMX (city)',
    clientName: 'Client Name',
    clientNamePlaceholder: 'e.g. Paola & Santiago García',
    city: 'City',
    cityPlaceholder: 'e.g. Ciudad de México, Cancún, Rome...',

    clickDates: 'Click dates to select event days',
    selectDaysHint: 'Select days in the calendar',

    eventDescription: 'Event description',
    eventDescriptionPlaceholder: 'e.g. Sangeet, Ceremony, Reception...',
    eventDescriptionEmpty: 'Event description not entered',
    venuePlaceholder: 'e.g. Sofitel Reforma CDMX',
    notes: 'Notes',
    notesPlaceholder: 'e.g. Ballroom Louvre, floor -1, side entrance...',
    logistics: 'Logistics Times',
    setup: 'Setup',
    breakdown: 'Breakdown',
    supplierAccess: 'Supplier Access',
    supplierRegulations: 'Supplier Regulations',
    regulationsUploaded: 'Regulations uploaded',
    uploading: 'Uploading...',
    uploadDoc: 'Upload PDF / Document',
    addLayout: 'Add Layout',
    layoutLabel: (n) => `Layout (${n} file${n !== 1 ? 's' : ''})`,
    layoutItem: (i) => `Layout ${i + 1}`,

    all: 'All',
    noFurniture: (city) => `No items available for ${city || 'this city'}.`,
    noFlowers: 'No flowers available.',
    furnitureSelection: (n) => `Selection (${n} ${n === 1 ? 'piece' : 'pieces'})`,
    flowersSelection: (n) => `Selection (${n} ${n === 1 ? 'unit' : 'units'})`,
    furnitureSubtotal: 'Furniture subtotal',
    flowersSubtotal: 'Flowers subtotal',

    notesMainPlaceholder: 'Additional information, special requests, team instructions...',

    saveAsDraft: 'Save as draft',
    sendToTqf: 'Send to Te Quiero Feliz',

    enterEventCode: 'Please enter an event code.',
    selectOneDay: 'Select at least one day for the event.',
    eventSent: 'Event sent!',
    draftSaved: 'Draft saved.',
    saveError: 'Save error.',
    regulationUploaded: 'Regulation uploaded.',
    regulationError: 'Error uploading regulation.',
    layoutUploaded: (n) => `${n} layout${n !== 1 ? 's' : ''} uploaded.`,
    layoutError: 'Error uploading layout.',
    pdfError: 'Error generating PDF.',

    itemsCount: (n) => `${n} ${n === 1 ? 'item' : 'items'}`,
    customItemsTitle: 'Ideas & Custom Elements',
    add: 'Add',
    customItemsEmptyHint: 'Add photos or notes for ideas not in the catalog',
    addMorePhotos: 'Add photos',
    uploadPhoto: 'Upload photo',
    imageUploaded: (n) => `${n} ${n === 1 ? 'image uploaded' : 'images uploaded'}.`,
    imageUploadError: 'Error uploading image.',
    customItemNotePlaceholder: 'Describe the idea, material, color, quantity...',

    yourEvents: 'Your events',
    eventCount: (n) => `${n} ${n === 1 ? 'event' : 'events'}`,
    noEventsYet: 'No events yet',
    noEventsHint: 'Create your first event to start planning.',
    eventNameless: 'Unnamed event',
    clientLabel: 'Client',
    daysCount: (n) => `${n} ${n === 1 ? 'day' : 'days'}`,
    furnitureCount: (n) => `${n} ${n === 1 ? 'furniture item' : 'furniture items'}`,
    flowersCount: (n) => `${n} ${n === 1 ? 'flower' : 'flowers'}`,
    statusDraft: 'Draft',
    statusSubmitted: 'Submitted',
    edit: 'Edit',
    logout: 'Log out',
    deleteEventConfirm: (name) => `Delete "${name}"?`,
    eventDeleted: 'Event deleted.',
    deleteError: 'Delete error.',
  },

  es: {
    monthsFull: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    monthsShort: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
    days: ['Lu','Ma','Mi','Ju','Vi','Sa','Do'],
    daySelected: 'día seleccionado',
    daysSelected: 'días seleccionados',
    dateMonths: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],

    myEvents: 'Mis eventos',
    newEvent: 'Nuevo Evento',
    editEvent: 'Editar Evento',
    saveDraft: 'Guardar borrador',
    send: 'Enviar',
    downloadPdf: 'PDF',

    eventDetails: 'Detalles del Evento',
    daysVenue: 'Días & Venue',
    furnitureCatalog: (city) => `Catálogo de Mobiliario${city ? ` — ${city}` : ''}`,
    flowerCatalog: 'Catálogo de Flores',
    generalNotes: 'Notas Generales',
    estimatedTotal: 'Total Estimado',

    eventCode: 'Código de Evento',
    eventCodePlaceholder: 'ej. PS0426CDMX  (iniciales novia·novio + mes·año + ciudad)',
    eventCodeHint: 'Formato sugerido: PS (P=novia, S=novio) + 04 (mes) + 26 (año) + CDMX (ciudad)',
    clientName: 'Nombre del Cliente',
    clientNamePlaceholder: 'ej. Paola & Santiago García',
    city: 'Ciudad',
    cityPlaceholder: 'ej. Ciudad de México, Cancún, Roma...',

    clickDates: 'Haz clic en las fechas para seleccionar los días del evento',
    selectDaysHint: 'Selecciona los días en el calendario',

    eventDescription: 'Descripción del evento',
    eventDescriptionPlaceholder: 'ej. Sangeet, Ceremonia, Recepción...',
    eventDescriptionEmpty: 'Descripción del evento no ingresada',
    venuePlaceholder: 'ej. Sofitel Reforma CDMX',
    notes: 'Notas',
    notesPlaceholder: 'ej. Ballroom Louvre, piso -1, entrada lateral...',
    logistics: 'Horarios Logísticos',
    setup: 'Montaje',
    breakdown: 'Desmontaje',
    supplierAccess: 'Acceso de Proveedores',
    supplierRegulations: 'Reglamento de Proveedores',
    regulationsUploaded: 'Reglamento cargado',
    uploading: 'Cargando...',
    uploadDoc: 'Subir PDF / Documento',
    addLayout: 'Agregar Layout',
    layoutLabel: (n) => `Layout (${n} archivo${n !== 1 ? 's' : ''})`,
    layoutItem: (i) => `Layout ${i + 1}`,

    all: 'Todos',
    noFurniture: (city) => `Sin elementos disponibles para ${city || 'esta ciudad'}.`,
    noFlowers: 'Sin flores disponibles.',
    furnitureSelection: (n) => `Selección (${n} ${n === 1 ? 'pieza' : 'piezas'})`,
    flowersSelection: (n) => `Selección (${n} ${n === 1 ? 'unidad' : 'unidades'})`,
    furnitureSubtotal: 'Subtotal mobiliario',
    flowersSubtotal: 'Subtotal flores',

    notesMainPlaceholder: 'Información adicional, solicitudes especiales, instrucciones para el equipo...',

    saveAsDraft: 'Guardar como borrador',
    sendToTqf: 'Enviar a Te Quiero Feliz',

    enterEventCode: 'Por favor ingresa el código del evento.',
    selectOneDay: 'Selecciona al menos un día para el evento.',
    eventSent: '¡Evento enviado!',
    draftSaved: 'Borrador guardado.',
    saveError: 'Error al guardar.',
    regulationUploaded: 'Reglamento cargado.',
    regulationError: 'Error al cargar el reglamento.',
    layoutUploaded: (n) => `${n} layout${n !== 1 ? 's' : ''} cargado${n !== 1 ? 's' : ''}.`,
    layoutError: 'Error al cargar el layout.',
    pdfError: 'Error al generar el PDF.',

    itemsCount: (n) => `${n} ${n === 1 ? 'artículo' : 'artículos'}`,
    customItemsTitle: 'Ideas & Elementos Personalizados',
    add: 'Agregar',
    customItemsEmptyHint: 'Agrega fotos o notas para ideas que no están en el catálogo',
    addMorePhotos: 'Agregar fotos',
    uploadPhoto: 'Subir foto',
    imageUploaded: (n) => `${n} ${n === 1 ? 'imagen cargada' : 'imágenes cargadas'}.`,
    imageUploadError: 'Error al cargar la imagen.',
    customItemNotePlaceholder: 'Describe la idea, el material, el color, la cantidad...',

    yourEvents: 'Tus eventos',
    eventCount: (n) => `${n} ${n === 1 ? 'evento' : 'eventos'}`,
    noEventsYet: 'Aún no hay eventos',
    noEventsHint: 'Crea tu primer evento para comenzar a planificar.',
    eventNameless: 'Evento sin nombre',
    clientLabel: 'Cliente',
    daysCount: (n) => `${n} ${n === 1 ? 'día' : 'días'}`,
    furnitureCount: (n) => `${n} ${n === 1 ? 'mueble' : 'muebles'}`,
    flowersCount: (n) => `${n} ${n === 1 ? 'flor' : 'flores'}`,
    statusDraft: 'Borrador',
    statusSubmitted: 'Enviado',
    edit: 'Editar',
    logout: 'Salir',
    deleteEventConfirm: (name) => `¿Eliminar "${name}"?`,
    eventDeleted: 'Evento eliminado.',
    deleteError: 'Error al eliminar.',
  },
};
