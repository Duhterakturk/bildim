// Canlı bulmacanın cevabını vermez. Yalnızca nasıl düşünüleceğini söyler.
export const HINTS = {
  kakuro: {
    tr: { hint: "Yeşil karenin sağ üst sayısı sağa, sol alt sayısı aşağı gider. İki karelik 3 yalnız 1 ve 2 olabilir.", example: "Sağ üstte 4 ve iki beyaz kare varsa oraya 1 ile 3 düşer. Aynı rakam o sırada tekrar etmez." },
    en: { hint: "The top-right number runs to the right. The bottom-left number runs down. A 3 in two cells can only be 1 and 2.", example: "A 4 above two white cells is 1 and 3. That run does not repeat a digit." },
  },
  sudoku: {
    tr: { hint: "Bir satırda tek rakam eksikse o rakam bellidir. Sonra kutu okunur.", example: "Satırda 1’den 8’e kadar doluysa boş kare 9’dur." },
    en: { hint: "A row missing one digit already knows that digit. The box is read next.", example: "A row with 1 through 8 already filled ends with 9." },
  },
  "bolgesel-sudoku": {
    tr: { hint: "Renkli bölge bir satır gibi okunur. 1, 2, 3, 4 her bölgede bir kez durur.", example: "Bölgede 1, 2 ve 4 varsa boş yere 3 gelir." },
    en: { hint: "A colored region reads like a row. 1 through 4 appear once.", example: "A region that already has 1, 2 and 4 needs a 3." },
  },
  apartman: {
    tr: { hint: "Kenarda 4 yazıyorsa binalar o yönde küçükten büyüğe dizilir.", example: "Solda 4 görünen bir satır 1, 2, 3, 4 sırasıdır." },
    en: { hint: "A 4 on the edge means the buildings rise in order from that side.", example: "A left clue of 4 means the row is 1, 2, 3, 4." },
  },
  cit: {
    tr: { hint: "3, o karenin üç kenarında çizgi olduğunu söyler. Çizgi sonunda tek bir halka olmalı.", example: "Köşedeki 2, iki dış kenarın çizileceğini haber verir." },
    en: { hint: "A 3 means three sides of that cell are on the loop. The line closes once.", example: "A 2 in a corner often uses the two outer edges." },
  },
  "amiral-batti": {
    tr: { hint: "Üstteki gemilerin hepsi yerleştirilir. 0 yazan satır boş kalır. Gemiler yatay, dikey ve çapraz değmez.", example: "Satırda 1 yazıyorsa o satırda tek bir gemi karesi vardır." },
    en: { hint: "Every ship shown above is placed. A row marked 0 stays empty. Ships do not touch horizontally, vertically, or diagonally.", example: "A row marked 1 holds exactly one ship cell." },
  },
  "sihirli-piramit": {
    tr: { hint: "Yol tepeden iner. Her sırada bir daire durur ve adım yalnız alttaki komşuya değer. Aynı sayı yolda bir kez geçer.", example: "Tepedeki 3 kullanıldıysa alttaki başka bir 3 yola girmez." },
    en: { hint: "The path comes down from the top. One circle stands on each row, and a step only touches the neighbor below. Each number appears once.", example: "Once the top 3 is used, another 3 stays off the path." },
  },
  patika: {
    tr: { hint: "Her beyaz karenin halkada iki komşusu vardır. Çıkmaz bir kare halkaya girmez.", example: "İki beyaz kare yan yanaysa aralarındaki çizgi halkaya ait olabilir." },
    en: { hint: "Each white cell has two neighbors on the loop. A dead end stays off the loop.", example: "When two white cells sit side by side, the line between them may belong to the loop." },
  },
  "abc-baglama": {
    tr: { hint: "Aynı harfi birbirine bağla. Çizgi yalnız yatay ve dikey gider, kesişmez. Bütün kareler dolu olmalı.", example: "A’dan komşu karelere uzan, diğer A’da bitir." },
    en: { hint: "Join the matching letters. The line moves only sideways or up and down, and it does not cross. Every cell must be filled.", example: "Start at A, step to a neighbor, and finish on the other A." },
  },
  "islem-karesi": {
    tr: { hint: "Çarpma ve bölme önce gelir. Verilen sayı sabit kalır, boş kare sonuçtan geri okunur.", example: "9 × boş − 8 = 46 ise boş kare 6’dır." },
    en: { hint: "Multiplication and division come first. A given number stays, and the blank is read back from the result.", example: "If 9 × blank − 8 = 46, the blank is 6." },
  },
  kendoku: {
    tr: { hint: "Çıkarma ve bölmede sıra serbesttir. 2− olan iki kare, aralarında 2 fark olan bir çifttir.", example: "3− yazan iki kare 1 ve 4, ya da 2 ve 5 olabilir." },
    en: { hint: "Subtraction and division ignore order. A cage of 2− is a pair two apart.", example: "A 3− cage can be 1 and 4, or 2 and 5." },
  },
  "yildiz-savaslari": {
    tr: { hint: "Bir yıldıza komşu sekiz kare boş kalır. Her satırda bir tane durur.", example: "Köşedeki yıldız, yanındaki satır ve sütunu o köşeden uzak tutar." },
    en: { hint: "The eight cells around a star stay empty. Each row holds one star.", example: "A corner star keeps the next star away from that row and column." },
  },
  "kare-karalamaca": {
    tr: { hint: "Satırdaki sayılar boyalı grupların uzunluğudur. Aralarında en az bir boş kare vardır.", example: "5 karelik satırda 5 yazıyorsa satırın tamamı boyalıdır." },
    en: { hint: "The numbers are the lengths of shaded groups, with a gap between them.", example: "A 5 in a row of five cells means the whole row is shaded." },
  },
  carpmaca: {
    tr: { hint: "Hücre, satırdaki sayı ile sütundaki sayının çarpımıdır.", example: "Satır 3, sütun 4 ise hücre 12’dir." },
    en: { hint: "A cell is the row heading times the column heading.", example: "Row 3 and column 4 make 12." },
  },
  futoshiki: {
    tr: { hint: "Küçük ağız küçük sayıyı gösterir. İşarete komşu iki kare önce okunur.", example: "1 < boş ise boş kare 1 olamaz. En az 2’dir." },
    en: { hint: "The small end of the sign points at the smaller number. The two cells beside a sign are read first.", example: "If 1 < blank, the blank cannot be 1." },
  },
  pentominolar: {
    tr: { hint: "Parçalar döndürülebilir ve ters çevrilebilir. Çerçeveye tam oturan köşe parçası önce gelir.", example: "Artı şekli ortaya yakın durur; köşeye sığmaz." },
    en: { hint: "Pieces can be rotated and flipped. The piece that fits a corner comes first.", example: "The plus shape sits near the middle. It does not fit a corner." },
  },
  metaforms: {
    tr: { hint: "Desenin tamamı, beyaz kareler dahil, 3×3 tahtanın içine sığar. Taralı kare öznenin yeridir. Çarpı o kareyi yasaklar. İçi boş şekil o şekildeki parçalardan en az biridir. Renkli kalem o renkteki parçalardan en az biridir. Boş beyaz karede herhangi bir parça durabilir.", example: "Tek kareye kilitlenen parça önce oturur." },
    en: { hint: "The whole pattern, including the white cells, fits inside the 3×3 board. A hatched cell is where the subject sits. A cross forbids that cell. An empty shape is at least one piece of that shape. A colored pencil is at least one piece of that color. Any piece may sit in a blank white cell.", example: "A piece locked to one cell settles first." },
  },
  numbers: {
    tr: { hint: "Verilen sayı başlangıçtır. İki yıldızın toplamı belliyse boş olan çıkar.", example: "Biri 4 ve toplam 11 ise diğeri 7’dir." },
    en: { hint: "A given number is the start. When two stars add up to a total, the blank is what remains.", example: "If one star is 4 and the sum is 11, the other is 7." },
  },
  colours: {
    tr: { hint: "Tikli kareler listedeki öğeleri alır. Çarpılı karede o öğe durmaz.", example: "İki mavi çizgi, iki tikli kareye iki mavi parça ister." },
    en: { hint: "Checked cells take the listed items. A crossed cell does not hold those items.", example: "Two blue strokes ask for two blue pieces in the checked cells." },
  },
};

export function hintFor(slug, language) {
  const row = HINTS[slug];
  if (!row) return null;
  return language === "en" ? row.en : row.tr;
}
