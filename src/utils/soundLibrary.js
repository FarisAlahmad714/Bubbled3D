// src/utils/soundLibrary.js

// Define the 33 real sounds from public/Sounds/
const realSounds = [
  { id: 1, name: "Clap 1", url: "/Sounds/clap1.wav", category: "Clap", duration: 5000 },
  { id: 2, name: "Clap 2", url: "/Sounds/clap2.wav", category: "Clap", duration: 5000 },
  { id: 3, name: "Clap 3", url: "/Sounds/clap3.wav", category: "Clap", duration: 5000 },
  { id: 4, name: "Drum 1", url: "/Sounds/drum1.wav", category: "Drum", duration: 5000 },
  { id: 5, name: "Drum 2", url: "/Sounds/drum2.wav", category: "Drum", duration: 5000 },
  { id: 6, name: "Drum 3", url: "/Sounds/drum3.wav", category: "Drum", duration: 5000 },
  { id: 7, name: "Drum 4", url: "/Sounds/drum4.wav", category: "Drum", duration: 5000 },
  { id: 8, name: "Drum 5", url: "/Sounds/drum5.wav", category: "Drum", duration: 5000 },
  { id: 9, name: "Drum 6", url: "/Sounds/drum6.wav", category: "Drum", duration: 5000 },
  { id: 10, name: "Drum 7", url: "/Sounds/drum7.wav", category: "Drum", duration: 5000 },
  { id: 11, name: "Drum 8", url: "/Sounds/drum8.wav", category: "Drum", duration: 5000 },
  { id: 12, name: "Drum 9", url: "/Sounds/drum9.wav", category: "Drum", duration: 5000 },
  { id: 13, name: "Drum 10", url: "/Sounds/drum10.wav", category: "Drum", duration: 5000 },
  { id: 14, name: "Drum 11", url: "/Sounds/drum11.wav", category: "Drum", duration: 5000 },
  { id: 15, name: "Drum 12", url: "/Sounds/drum12.wav", category: "Drum", duration: 5000 },
  { id: 16, name: "Snare 9", url: "/Sounds/drumsnare9.wav", category: "Snare", duration: 5000 },
  { id: 17, name: "Intro 1", url: "/Sounds/intro.wav", category: "Intro", duration: 6000 },
  { id: 18, name: "Intro 2", url: "/Sounds/intro2.wav", category: "Intro", duration: 6000 },
  { id: 19, name: "Intro 3", url: "/Sounds/intro3.wav", category: "Intro", duration: 6000 },
  { id: 20, name: "Loop 1", url: "/Sounds/loop1.wav", category: "Loop", duration: 8000 },
  { id: 21, name: "Loop 2", url: "/Sounds/loop2.wav", category: "Loop", duration: 8000 },
  { id: 22, name: "Loop 3", url: "/Sounds/loop3.wav", category: "Loop", duration: 8000 },
  { id: 23, name: "Loop 4", url: "/Sounds/loop4.wav", category: "Loop", duration: 8000 },
  { id: 24, name: "Loop 5", url: "/Sounds/loop5.wav", category: "Loop", duration: 8000 },
  { id: 25, name: "Loop 6", url: "/Sounds/loop6.wav", category: "Loop", duration: 8000 },
  { id: 26, name: "Loop 7", url: "/Sounds/loop7.wav", category: "Loop", duration: 8000 },
  { id: 27, name: "Loop 8", url: "/Sounds/loop8.wav", category: "Loop", duration: 8000 },
  { id: 28, name: "Loop 9", url: "/Sounds/loop9.wav", category: "Loop", duration: 8000 },
  { id: 29, name: "Loop 10", url: "/Sounds/loop10.wav", category: "Loop", duration: 8000 },
  { id: 30, name: "Piano 1", url: "/Sounds/piano1.wav", category: "Piano", duration: 7000 },
  { id: 31, name: "Piano 2", url: "/Sounds/piano2.wav", category: "Piano", duration: 7000 },
  { id: 32, name: "Piano 3", url: "/Sounds/piano3.wav", category: "Piano", duration: 7000 },
];

// Generate 167 placeholder sounds to reach 200 total
const placeholderSounds = Array.from({ length: 167 }, (_, i) => {
  const id = 33 + i;
  const categories = ["Drum", "Synth", "Piano", "Loop", "Effect"];
  const category = categories[Math.floor(i / 33.4)]; // Distribute ~33 per category
  const durations = {
    Drum: 5000,
    Synth: 6000,
    Piano: 7000,
    Loop: 8000,
    Effect: 5000,
  };
  return {
    id,
    name: `${category} ${id}`,
    url: `/Sounds/placeholder${id}.wav`, // Placeholder path
    category,
    duration: durations[category],
  };
});

// Combine real and placeholder sounds
const soundLibrary = [...realSounds, ...placeholderSounds];

export default soundLibrary;