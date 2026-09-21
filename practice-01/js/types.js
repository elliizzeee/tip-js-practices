"use strict";

//1
const result1 = "8" + 2;
console.log("Результат:", result1);
console.log("Тип результата:", typeof result1);

//2
const result2 = "8" - 2;
console.log("Результат:", result2);
console.log("Тип результата:", typeof result2);

//3
const result3 = Number("8") + 2;
console.log("Результат:", result3);
console.log("Тип результата:", typeof result3);

//4
const result4 = "12" > "3";
console.log("Результат:", result4);
console.log("Тип результата:", typeof result4);

//5
const result5 = 12 === "12";
console.log("Результат:", result5);
console.log("Тип результата:", typeof result5);

//6
const result6 = Number("");
console.log("Результат:", result6);
console.log("Тип результата:", typeof result6);

//7
const result7 = Number("text");
console.log("Результат:", result7);
console.log("Тип результата:", typeof result7);

//8
const result8 = Boolean("false");
console.log("Результат:", result8);
console.log("Тип результата:", typeof result8);

//9
console.log("Результат:", typeof null);
console.log("Тип результата:", typeof (typeof null));

//10
console.log("Результат:", typeof NaN);
console.log("Тип результата:", typeof (typeof NaN));