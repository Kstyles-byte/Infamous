interface Location {
  id: string;
  name: string;
}

export const STATES: Location[] = [
  { id: '1', name: 'Lagos' },
  { id: '2', name: 'Abuja' },
  { id: '3', name: 'Port Harcourt' },
  { id: '4', name: 'Kano' },
  { id: '5', name: 'Ibadan' }
];

interface Areas {
  [key: string]: Location[];
}

export const AREAS: Areas = {
  '1': [
    { id: '1-1', name: 'Lekki' },
    { id: '1-2', name: 'Victoria Island' },
    { id: '1-3', name: 'Ikoyi' },
    { id: '1-4', name: 'Ajah' },
    { id: '1-5', name: 'Ikeja' },
    { id: '1-6', name: 'Surulere' }
  ],
  '2': [
    { id: '2-1', name: 'Garki' },
    { id: '2-2', name: 'Wuse' },
    { id: '2-3', name: 'Maitama' },
    { id: '2-4', name: 'Asokoro' },
    { id: '2-5', name: 'Gwarinpa' }
  ],
  '3': [
    { id: '3-1', name: 'Old GRA' },
    { id: '3-2', name: 'New GRA' },
    { id: '3-3', name: 'Rumuola' },
    { id: '3-4', name: 'Trans Amadi' },
    { id: '3-5', name: 'Diobu' }
  ],
  '4': [
    { id: '4-1', name: 'Sabon Gari' },
    { id: '4-2', name: 'Bompai' },
    { id: '4-3', name: 'Fagge' },
    { id: '4-4', name: 'Nasarawa' },
    { id: '4-5', name: 'Gwale' }
  ],
  '5': [
    { id: '5-1', name: 'Bodija' },
    { id: '5-2', name: 'Apata' },
    { id: '5-3', name: 'Mokola' },
    { id: '5-4', name: 'Dugbe' },
    { id: '5-5', name: 'Ring Road' }
  ]
}; 