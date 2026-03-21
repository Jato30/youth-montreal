export const transitLines = {
  metro: [
    {
      id: 'green',
      name: 'Metro Green Line',
      color: '#34A853',
      points: [
        [45.4487, -73.5935],
        [45.4834, -73.5552],
        [45.5018, -73.5715],
        [45.5146, -73.5626],
        [45.5322, -73.5526],
        [45.5814, -73.5466]
      ]
    },
    {
      id: 'orange',
      name: 'Metro Orange Line',
      color: '#F29900',
      points: [
        [45.5583, -73.6514],
        [45.5171, -73.5904],
        [45.4957, -73.5802],
        [45.5146, -73.5626],
        [45.5314, -73.5583],
        [45.5580, -73.6131],
        [45.5900, -73.6380]
      ]
    },
    {
      id: 'yellow',
      name: 'Metro Yellow Line',
      color: '#FBBC05',
      points: [
        [45.5146, -73.5626],
        [45.5156, -73.5322],
        [45.5184, -73.5141]
      ]
    }
  ],
  rem: [
    {
      id: 'rem-main',
      name: 'REM',
      color: '#66BB6A',
      points: [
        [45.4902, -73.5604],
        [45.4688, -73.5454],
        [45.4628, -73.4831],
        [45.4458, -73.4556],
        [45.5237, -73.7054],
        [45.5602, -73.7416]
      ]
    }
  ],
  train: [
    {
      id: 'line-11',
      name: 'Train Line 11',
      color: '#E91E63',
      points: [
        [45.4952, -73.5645],
        [45.5106, -73.5675],
        [45.5370, -73.6352],
        [45.5580, -73.6772]
      ]
    },
    {
      id: 'line-12',
      name: 'Train Line 12',
      color: '#FDD835',
      points: [
        [45.4905, -73.5666],
        [45.4626, -73.5898],
        [45.4342, -73.6402],
        [45.3842, -73.5228]
      ]
    },
    {
      id: 'line-13',
      name: 'Train Line 13',
      color: '#8E24AA',
      points: [
        [45.5032, -73.5698],
        [45.5312, -73.6122],
        [45.5578, -73.6534]
      ]
    },
    {
      id: 'line-14',
      name: 'Train Line 14',
      color: '#00BCD4',
      points: [
        [45.4984, -73.5684],
        [45.4747, -73.5862],
        [45.4498, -73.6016]
      ]
    },
    {
      id: 'via-rail',
      name: 'VIA Rail Corridor',
      color: '#607D8B',
      points: [
        [45.5012, -73.5662],
        [45.5259, -73.6052],
        [45.5487, -73.6441],
        [45.5731, -73.6865]
      ]
    },
    {
      id: 'adirondack',
      name: 'Adirondack',
      color: '#D32F2F',
      points: [
        [45.5012, -73.5662],
        [45.4705, -73.5759],
        [45.4382, -73.5854],
        [45.4066, -73.5958]
      ]
    }
  ]
};

export const transitStations = {
  metro: [
    { name: 'Angrignon', lat: 45.4487, lng: -73.5935, color: '#34A853' },
    { name: 'Lionel-Groulx', lat: 45.4834, lng: -73.5552, color: '#34A853' },
    { name: 'Berri-UQAM', lat: 45.5146, lng: -73.5626, color: '#F29900' },
    { name: 'Longueuil', lat: 45.5184, lng: -73.5141, color: '#FBBC05' }
  ],
  rem: [
    { name: 'Gare Centrale', lat: 45.4902, lng: -73.5604, color: '#66BB6A' },
    { name: 'Île-des-Soeurs', lat: 45.4688, lng: -73.5454, color: '#66BB6A' },
    { name: 'Panama', lat: 45.4628, lng: -73.4831, color: '#66BB6A' },
    { name: 'Brossard', lat: 45.4458, lng: -73.4556, color: '#66BB6A' }
  ],
  train: [
    { name: 'Line 11 Station', lat: 45.5370, lng: -73.6352, color: '#E91E63' },
    { name: 'Line 12 Station', lat: 45.4626, lng: -73.5898, color: '#FDD835' },
    { name: 'Line 13 Station', lat: 45.5312, lng: -73.6122, color: '#8E24AA' },
    { name: 'Line 14 Station', lat: 45.4747, lng: -73.5862, color: '#00BCD4' },
    { name: 'VIA Rail', lat: 45.5487, lng: -73.6441, color: '#607D8B' },
    { name: 'Adirondack', lat: 45.4382, lng: -73.5854, color: '#D32F2F' }
  ]
};
