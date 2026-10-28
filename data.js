/* VALMASS · catálogo (cafés tostados por Drupa y tés Inti Zen)
   Fuente: drupa.com.ar — precios de referencia relevados el 28/10/2026.
   Para actualizar un precio, cambiá el número en "precio". */
window.VALMASS_DATA = {
  cafes: [
    { id: 'brasilparaiso', nombre: 'Paraíso', origen: 'Brasil', tipo: 'brasil', precio: 21780, color: '#4878b8', img: 'assets/drupa/brasilparaiso.webp',
      region: 'Cerrado Mineiro', varietal: 'Catuaí Rojo', proceso: 'Semi lavado', altura: '1050 m', tueste: 'Media', cuerpo: 'Alto', notas: 'Cacao, maracuyá, dátil, nueces pecán', sca: '84', extra: 'Calificativo de cata: cremoso' },
    { id: 'brasilrosaamarela', nombre: 'Rosa Amarela', origen: 'Brasil', tipo: 'brasil', precio: 21780, color: '#2f9a86', img: 'assets/drupa/brasilrosaamarela.webp',
      region: 'Cerrado Mineiro', varietal: '—', proceso: 'Natural', altura: '1200 m', tueste: 'Media alta', cuerpo: 'Alto', notas: 'Chocolate, frutos secos', extra: 'Fragancia: caramelo, dulce' },
    { id: 'brasil-cerrado-anaerobico-x-250-grs', nombre: 'Cerrado Anaeróbico', origen: 'Brasil', tipo: 'brasil', precio: 26590, precioKg: 69200, color: '#9a5a48', img: 'assets/drupa/brasil-cerrado-anaerobico-x-250-grs.webp', imgKg: 'assets/drupa/brasil-cerrado-anaerobico-x-kg.webp',
      region: 'Cerrado Mineiro', varietal: 'Paraíso (híbrido Catuaí / Timor)', proceso: 'Natural anaeróbico', altura: '1050 m', tueste: 'Media', cuerpo: 'Meloso', notas: 'Pera, licor de cereza, caramelo, chocolate y praliné de avellanas', sca: '86' },
    { id: 'cafecolombiapalmera', nombre: 'Palmera', origen: 'Colombia', tipo: 'colombia', precio: 25290, color: '#785898', img: 'assets/drupa/cafecolombiapalmera.webp',
      region: 'Huila', varietal: 'Caturra, Castillo', proceso: 'Lavado', altura: '1500 m', tueste: 'Media', cuerpo: 'Medio / alto', notas: 'Chocolate con leche, cereza y naranja', extra: 'Fragancia: dulce, floral' },
    { id: 'cafe-colombia-inza-x-250-grs', nombre: 'Inzá', origen: 'Colombia', tipo: 'colombia', precio: 25290, color: '#c87f86', img: 'assets/drupa/cafe-colombia-inza-x-250-grs.webp',
      region: 'Cauca', varietal: 'Castillo, Caturra, Typica', proceso: 'Lavado', altura: '1450 – 1900 m', tueste: 'Media', cuerpo: 'Medio', notas: 'Durazno, manzana roja, miel y chocolate con leche', sca: '85' },
    { id: 'colombia-bolivar-250g', nombre: 'Bolívar', origen: 'Colombia', tipo: 'colombia', precio: 31500, color: '#0a84b4', img: 'assets/drupa/colombia-bolivar-250g.webp',
      region: 'Antioquia', varietal: 'Caturra', proceso: 'Natural', altura: '1900 m', tueste: 'Media', cuerpo: 'Sedoso', notas: 'Papaya, chocolate, miel y frutas amarillas', sca: '86' },
    { id: 'peru-pomelo-de-niebla', nombre: 'Pomelo de Niebla', origen: 'Perú', tipo: 'peru', precio: 23890, color: '#1c4a5a', img: 'assets/drupa/peru-pomelo-de-niebla.webp',
      region: 'Cajamarca', varietal: 'Bourbon, Caturra, Pache', proceso: 'Lavado', altura: '1830 m', tueste: 'Media', cuerpo: 'Sedoso', notas: 'Chocolate con leche, naranja sanguínea, mantequilla y limoncillo', sca: '84' },
    { id: 'cafe-peru-organico-alta-montana-x-250-grs', nombre: 'Orgánico Alta Montaña', origen: 'Perú', tipo: 'peru', precio: 25290, color: '#857536', img: 'assets/drupa/cafe-peru-organico-alta-montana-x-250-grs.webp',
      region: 'Amazonas', varietal: 'Typica, Caturra, Pache', proceso: 'Lavado', altura: '1900 m', tueste: 'Media', cuerpo: 'Medio', notas: 'Pasas sultanas, manzana asada y mora' },
    { id: 'cafe-etiopia-limmu-kossa-x-250-grs', nombre: 'Limmu Kossa', origen: 'Etiopía', tipo: 'africa', precio: 29370, color: '#e07444', img: 'assets/drupa/cafe-etiopia-limmu-kossa-x-250-grs.webp',
      region: 'Guji', varietal: 'Heirloom', proceso: 'Lavado', altura: '1900 – 2200 m', tueste: 'Media', cuerpo: 'Medio', notas: 'Flor de mandarina, papaya, chocolate negro', sca: '86' },
    { id: 'kenya', nombre: 'AB Kamavindi', origen: 'Kenia', tipo: 'africa', precio: 27225, color: '#a2614f', img: 'assets/drupa/kenya.webp',
      region: 'Embu', varietal: '—', proceso: 'Lavado', altura: '1680 m', tueste: 'Medio', cuerpo: 'Medio', notas: 'Té negro, zarzamora y citrón', sca: '86' },
    { id: 'blend-drupa', nombre: 'Blend Drupa', origen: 'Brasil & Colombia', tipo: 'blend', precio: 24380, color: '#0c8a76', img: 'assets/drupa/blend-drupa.webp',
      region: 'Cerrado Mineiro / Huila', varietal: 'Catuaí Rojo / Caturra, Castillo', proceso: 'Natural / lavado', altura: '1200 / 1500 m', tueste: 'Media / alta', cuerpo: 'Medio / alto', notas: 'Chocolate, cereza y frutos rojos' },
    { id: 'blend-andino', nombre: 'Blend Andino', origen: 'Perú & Colombia', tipo: 'blend', precio: 25300, color: '#c8641a', img: 'assets/drupa/blend-andino.webp',
      region: 'Cajamarca / Tolima', varietal: 'Bourbon, Caturra, Pache / Castillo, Caturra', proceso: 'Lavado', altura: '1500 / 1830 m', tueste: 'Media', cuerpo: '—', notas: 'Chocolate con leche, naranja sanguínea, cereza, mantequilla y limoncillo' },
    { id: 'blend-africa', nombre: 'Blend África', origen: 'Kenia & Etiopía', tipo: 'blend', precio: 28500, color: '#5652a8', img: 'assets/drupa/blend-africa.webp',
      region: 'Guji / Embu', varietal: 'Heirloom / SL28', proceso: 'Lavado', altura: '1680 – 2200 m', tueste: 'Media', cuerpo: 'Sedoso / untoso', notas: 'Papaya, chocolate negro y zarzamora' }
  ],
  molienda: ['Grano', 'Espresso', 'V60', 'Chemex', 'Prensa francesa', 'Moka', 'Aeropress'],
  tes: [
    { id: 'teintizenchamanchai15u', nombre: 'Chaman Chai', base: 'Té negro de la India', con: 'Canela, jengibre y cardamomo', color: '#f07a28', txt: 'La alquimia del té negro de la India con especias que agudizan los sentidos.' },
    { id: 'teintizenverdechai15u', nombre: 'Verde Chai', base: 'Té verde de Oriente', con: 'Canela, jengibre y cardamomo', color: '#1f9a2e', txt: 'La dulzura de la canela con el toque picante del jengibre sobre té verde.' },
    { id: 'teintizenblancolychee15u', nombre: 'Blanco Lychee', base: 'Té blanco', con: 'Lychee y cedrón', color: '#b9d34e', txt: 'Elegante té blanco con notas cítricas de cedrón y el dulzor exótico del lychee.' },
    { id: 'teintizendonjuan15u', nombre: 'Don Juan', base: 'Té negro de la India', con: 'Dulce de leche y frutos rojos', color: '#b8682c', txt: 'Cosechado a más de 1200 m al noreste de los Himalayas, con frutos rojos de la Patagonia.' },
    { id: 'teintizenamazoniamango15u', nombre: 'Amazonia Mango', base: 'Té negro de la India', con: 'Mango, papaya y durazno', color: '#e8a20c', txt: 'Un viaje tropical. Perfecto para tomar frío o caliente.' },
    { id: 'teintizenpatagoniabee15u', nombre: 'Patagonia Bee', base: 'Té negro de la India', con: 'Miel, vainilla y cacao', color: '#e3c00a', txt: 'Miel de la Patagonia, vainilla y cacao mexicano sobre té negro.' },
    { id: 'teintizenincarose15u', nombre: 'Inca Rose', base: 'Earl Grey de Ceylon', con: 'Bergamota y pétalos de rosa', color: '#7a3c8a', txt: 'Un Earl Grey delicado y floral, perfumado con rosas de la Patagonia.' },
    { id: 'teintizenintigrey15u', nombre: 'Inti Grey', base: 'Té negro de Oriente', con: 'Bergamota prensada en frío', color: '#e9c766', txt: 'El clásico Earl Grey, con notas cítricas de bergamota.' },
    { id: 'teintizenilumine15u', nombre: 'Ilumine', base: 'Breakfast tea', con: 'Ceylon de altura y Assam', color: '#d42c4a', txt: 'Té negro clásico, con cuerpo, sabor y aroma para arrancar el día.' },
    { id: 'teintizensilencioandino15u', nombre: 'Silencio Andino', base: 'Té verde de Oriente', con: 'Manzanilla y cascaritas de naranja', color: '#78b00e', txt: 'Dulce y suave, levemente cítrico y perfectamente equilibrado.' },
    { id: 'teintizen8blends15u', nombre: '8 Blends', base: 'Inti Selections', con: 'Los 8 blends de Inés Berton', color: '#8a54a0', txt: 'Para probarlos todos: Chaman Chai, Verde Chai, Blanco Lychee, Patagonia Bee, Inca Rose, Don Juan, Amazonia Mango y Silencio Andino.' }
  ],
  tePrecio: 5550,
  teUnidad: '15 saquitos de 2 g'
};
