const gameComponent = require('../game');

let test = new gameComponent.Board();
test.guesses = ['snipe', 'aorta'];
test.answers = ['aroma', 'aroma'];

let test2 = new gameComponent.Board();
test2.guesses = ['dooms'];
test2.answers = ['ocean'];

let test3 = new gameComponent.Board();
test3.guesses = ['brush'];
test3.answers = ['quiet'];

let test4 = new gameComponent.Board();
test4.guesses = ['aorta'];
test4.answers = ['aroma'];

console.log(gameComponent.validateMove(test, 'aroma', 'enemy'));
console.log(gameComponent.validateMove(test, 'snipe', 'enemy'));
console.log(gameComponent.validateMove(test, 'agora', 'enemy'));
console.log(gameComponent.validateMove(test2, 'hooky', 'enemy'));
console.log(gameComponent.validateMove(test2, 'snipe', 'enemy'));
console.log(gameComponent.validateMove(test3, 'clean', 'enemy'));
console.log(gameComponent.validateMove(test4, 'snipe', 'enemy'));