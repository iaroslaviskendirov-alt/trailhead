// Demo data inserted on first run. Trails are fictional.
module.exports.trails = [
  {
    name: 'Silverpine Ridge Loop',
    region: 'Cascade Highlands',
    difficulty: 'moderate',
    length_km: 11.4,
    elevation_m: 620,
    duration_h: 4,
    hue: 160,
    tags: ['loop', 'views', 'forest'],
    description:
      'A classic loop through old-growth pine that climbs to an open granite ridge with views across three valleys. The descent follows a creek with several shaded rest spots.',
    reviews: [
      { author: 'Maya', rating: 5, comment: 'The ridge at golden hour is unreal. Bring layers, it gets windy up top.', daysAgo: 3 },
      { author: 'Jonas', rating: 4, comment: 'Well marked and not too crowded on a weekday. The creek section is muddy after rain.', daysAgo: 12 },
    ],
  },
  {
    name: 'Lantern Falls Trail',
    region: 'Mossy Hollow',
    difficulty: 'easy',
    length_km: 4.2,
    elevation_m: 140,
    duration_h: 1.5,
    hue: 190,
    tags: ['waterfall', 'family', 'dog-friendly'],
    description:
      'A gentle out-and-back along a fern-lined gorge ending at a two-tier waterfall. Boardwalks cover the wettest sections, making it a good pick for families.',
    reviews: [
      { author: 'Priya', rating: 5, comment: 'Perfect with kids. The falls are loud and beautiful in spring.', daysAgo: 6 },
      { author: 'Tom', rating: 4, comment: 'Short and sweet. Parking fills up by 10am on weekends.', daysAgo: 20 },
      { author: 'Lena', rating: 5, comment: 'Took my dog, she loved the stream crossings.', daysAgo: 41 },
    ],
  },
  {
    name: 'Crowsnest Summit',
    region: 'Iron Peaks',
    difficulty: 'hard',
    length_km: 16.8,
    elevation_m: 1450,
    duration_h: 8,
    hue: 20,
    tags: ['summit', 'scramble', 'alpine'],
    description:
      'A demanding summit push with a final 200 m class-2 scramble. Rewarding hikers with a 360° panorama of the Iron Peaks range. Start early to avoid afternoon storms.',
    reviews: [
      { author: 'Diego', rating: 5, comment: 'Hardest day hike I have done this year and worth every step.', daysAgo: 9 },
      { author: 'Sam', rating: 3, comment: 'Loose rock near the top. Helmets are not a bad idea.', daysAgo: 33 },
    ],
  },
  {
    name: 'Saltmarsh Boardwalk',
    region: 'Grey Coast',
    difficulty: 'easy',
    length_km: 3.1,
    elevation_m: 5,
    duration_h: 1,
    hue: 45,
    tags: ['coast', 'birdwatching', 'accessible'],
    description:
      'A flat, fully accessible boardwalk through tidal marshland. Herons, egrets and migrating shorebirds are common from April to October.',
    reviews: [
      { author: 'Hannah', rating: 4, comment: 'Saw two herons and a kingfisher. Very peaceful.', daysAgo: 2 },
    ],
  },
  {
    name: 'Wolfden Canyon Traverse',
    region: 'Red Mesa',
    difficulty: 'hard',
    length_km: 21.5,
    elevation_m: 980,
    duration_h: 9,
    hue: 8,
    tags: ['canyon', 'desert', 'point-to-point'],
    description:
      'A point-to-point traverse through a slot canyon and across open mesa. There is no water on the route. Carry at least four litres and check flash-flood warnings.',
    reviews: [
      { author: 'Aiko', rating: 5, comment: 'The slot section feels like another planet.', daysAgo: 15 },
      { author: 'Marco', rating: 4, comment: 'Arrange a shuttle in advance. Long, hot, and epic.', daysAgo: 27 },
    ],
  },
  {
    name: 'Birchwood Meadows',
    region: 'Cascade Highlands',
    difficulty: 'easy',
    length_km: 6,
    elevation_m: 90,
    duration_h: 2,
    hue: 95,
    tags: ['meadow', 'wildflowers', 'loop'],
    description:
      'Rolling meadows and birch groves that burst with wildflowers in early summer. A relaxed loop with benches and picnic tables along the way.',
    reviews: [
      { author: 'Olivia', rating: 5, comment: 'Lupines everywhere in June. A great easy walk.', daysAgo: 5 },
      { author: 'Ben', rating: 4, comment: 'Nice for a trail run too.', daysAgo: 18 },
    ],
  },
  {
    name: 'Glacier Tongue Overlook',
    region: 'Iron Peaks',
    difficulty: 'moderate',
    length_km: 9.7,
    elevation_m: 710,
    duration_h: 4.5,
    hue: 205,
    tags: ['glacier', 'views', 'alpine'],
    description:
      'Switchbacks through larch forest lead to a moraine overlook facing a hanging glacier. Marmots are common and the larches turn gold in late September.',
    reviews: [
      { author: 'Noah', rating: 5, comment: 'Go in late September for the golden larches.', daysAgo: 1 },
    ],
  },
  {
    name: 'Old Mill Creek Path',
    region: 'Mossy Hollow',
    difficulty: 'moderate',
    length_km: 8.3,
    elevation_m: 310,
    duration_h: 3,
    hue: 130,
    tags: ['history', 'creek', 'forest'],
    description:
      'Follows a creek past the ruins of a 19th-century grist mill and several stone bridges. A few steep, rooty sections keep it interesting.',
    reviews: [
      { author: 'Grace', rating: 4, comment: 'The mill ruins are really cool, lots of interpretive signs.', daysAgo: 11 },
      { author: 'Leo', rating: 3, comment: 'Slippery roots when wet. Otherwise pleasant.', daysAgo: 47 },
    ],
  },
];
