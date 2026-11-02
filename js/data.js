/**
 * TVS Master Shopfloor Data & Structures
 * Direct extraction from:
 * - DON_DAT_HANG_TVS.xlsx (651 size lines, 113 POs, 64,837 pairs, 11,832 cartons)
 * - Dữ liệu LAF.xlsx (7 workstations, 28/32 sub-processes, 5M rules)
 * - He_Thong_Ke_Hoach_5M_LAF_TVS.xlsx
 */

window.TVS_MASTER_DATA = {
  rawGrouped: [{"d":"25/07/2026","c":"ITALY","o":"AE2607131","p":"0903080022-1","m":"LC1783","b":1,"s":[["UK 4",60,10],["UK 5",65,11],["UK 6",65,11],["UK 7",55,10],["UK 8",50,9],["UK 9",15,3]]},{"d":"10/08/2026","c":"ARGENTINA","o":"AE2607172","p":"0903082676-1","m":"LC1783","b":1,"s":[["UK 3",4,1],["UK 4",48,8],["UK 5",103,17],["UK 6",112,19],["UK 7",81,13],["UK 8",46,8],["UK 9",11,2]]},{"d":"10/08/2026","c":"ARGENTINA","o":"AE2607174","p":"0903082666-1","m":"LC1786","b":1,"s":[["UK 3",4,1],["UK 4",50,8],["UK 5",107,18],["UK 6",116,19],["UK 7",84,14],["UK 8",48,8],["UK 9",11,2]]},{"d":"10/08/2026","c":"CANADA","o":"AE2607171","p":"0903083861-1","m":"LC1783","b":1,"s":[["UK 4",22,4],["UK 5",71,12],["UK 6",116,20],["UK 7",110,19],["UK 8",60,10],["UK 9",23,4]]},{"d":"10/08/2026","c":"CHILE","o":"AE2607175","p":"0903081731-1","m":"LC1786","b":1,"s":[["UK 4",1,1],["UK 5",2,1],["UK 6",3,1],["UK 7",3,1],["UK 8",1,1]]},{"d":"10/08/2026","c":"ISRAEL","o":"AE2607563","p":"0903078126-1","m":"LC1783","b":1,"s":[["UK 3",11,2],["UK 4",127,21],["UK 5",275,46],["UK 6",284,47],["UK 7",122,20],["UK 8",21,4],["UK 9",4,1]]},{"d":"10/08/2026","c":"ISRAEL","o":"AE2607564","p":"0903078135-1","m":"LC1786","b":1,"s":[["UK 3",13,2],["UK 4",118,20],["UK 5",238,40],["UK 6",257,43],["UK 7",115,19],["UK 8",27,4],["UK 9",5,1]]},{"d":"10/08/2026","c":"TURKIYE","o":"AE2607173","p":"0903082520-1","m":"LC1783","b":1,"s":[["UK 4",94,16],["UK 5",161,27],["UK 6",153,26],["UK 7",84,14],["UK 8",1,0],["UK 9",1,0]]},{"d":"10/08/2026","c":"TURKIYE","o":"AE2607176","p":"0903082512-1","m":"LC1786","b":1,"s":[["UK 4",66,11],["UK 5",107,18],["UK 6",99,17],["UK 7",51,8],["UK 8",1,0],["UK 9",1,1]]},{"d":"25/08/2026","c":"CANADA","o":"AE2607212","p":"0903082757-1","m":"LC1786","b":1,"s":[["UK 4",24,4],["UK 5",55,10],["UK 6",78,13],["UK 7",69,12],["UK 8",47,8],["UK 9",27,5]]},{"d":"25/08/2026","c":"CANADA","o":"AE2607216","p":"0903082773-1","m":"LC1787","b":1,"s":[["UK 4",24,4],["UK 5",55,10],["UK 6",78,13],["UK 7",69,12],["UK 8",47,8],["UK 9",27,5]]},{"d":"25/08/2026","c":"GERMANY","o":"AE2607213","p":"0903082418-1","m":"LC1787","b":1,"s":[["UK 4",40,7],["UK 5",92,16],["UK 6",117,20],["UK 7",72,12],["UK 8",40,7],["UK 9",14,3]]},{"d":"25/08/2026","c":"GERMANY","o":"AE2607589","p":"0903077020-1","m":"LC1787","b":1,"s":[["UK 4",85,15],["UK 5",158,27],["UK 6",185,31],["UK 7",135,23],["UK 8",85,15],["UK 9",29,5]]},{"d":"25/08/2026","c":"GERMANY","o":"AE2607205","p":"0903203968-1","m":"LC1783","b":1,"s":[["UK 4",12,2],["UK 5",28,5],["UK 6",38,7],["UK 7",18,3],["UK 8",4,1]]},{"d":"25/08/2026","c":"UNITED KINGDOM","o":"AE2607206","p":"0903082863-1","m":"LC1783","b":1,"s":[["UK 4",40,7],["UK 5",80,14],["UK 6",110,19],["UK 7",60,10],["UK 8",10,2]]},{"d":"25/08/2026","c":"UNITED KINGDOM","o":"AE2607209","p":"0903081539-1","m":"LC1786","b":1,"s":[["UK 4",40,7],["UK 5",80,14],["UK 6",110,19],["UK 7",60,10],["UK 8",10,2]]},{"d":"25/08/2026","c":"UNITED KINGDOM","o":"AE2607210","p":"0903082594-1","m":"LC1786","b":1,"s":[["UK 4",38,19],["UK 5",81,41],["UK 6",117,59],["UK 7",62,31],["UK 8",37,19],["UK 9",25,13]]},{"d":"25/08/2026","c":"UNITED KINGDOM","o":"AE2607214","p":"0903082600-1","m":"LC1787","b":1,"s":[["UK 4",38,19],["UK 5",81,41],["UK 6",117,59],["UK 7",62,31],["UK 8",37,19],["UK 9",25,13]]},{"d":"25/08/2026","c":"UNITED KINGDOM","o":"AE2607588","p":"0903081117-1","m":"LC1783","b":1,"s":[["UK 4",77,39],["UK 5",162,81],["UK 6",233,117],["UK 7",124,62],["UK 8",74,37],["UK 9",50,25]]},{"d":"25/08/2026","c":"UNITED STATES","o":"AE2607207","p":"0903084204-1","m":"LC1783","b":1,"s":[["UK 4",26,5],["UK 5",102,17],["UK 6",162,27],["UK 7",150,25],["UK 8",104,18],["UK 9",28,5]]},{"d":"25/08/2026","c":"UNITED STATES","o":"AE2607208","p":"0903082138-1","m":"LC1783","b":1,"s":[["UK 5",80,14],["UK 6",110,19],["UK 7",100,17],["UK 8",70,12],["UK 9",40,7]]},{"d":"25/08/2026","c":"UNITED STATES","o":"AE2607211","p":"0903082128-1","m":"LC1786","b":1,"s":[["UK 5",80,14],["UK 6",110,19],["UK 7",100,17],["UK 8",70,12],["UK 9",40,7]]},{"d":"25/08/2026","c":"UNITED STATES","o":"AE2607215","p":"0903082122-1","m":"LC1787","b":1,"s":[["UK 5",80,14],["UK 6",110,19],["UK 7",100,17],["UK 8",70,12],["UK 9",40,7]]},{"d":"29/08/2026","c":"ITALY","o":"AE2607244","p":"0903079827-1","m":"LC1783","b":1,"s":[["UK 4",90,15],["UK 5",155,26],["UK 6",145,25],["UK 7",85,15],["UK 8",25,5],["UK 9",20,4]]},{"d":"29/08/2026","c":"ITALY","o":"AE2607245","p":"0903079858-1","m":"LC1786","b":1,"s":[["UK 4",65,11],["UK 5",130,22],["UK 6",135,23],["UK 7",80,14],["UK 8",45,8],["UK 9",10,2]]},{"d":"29/08/2026","c":"ITALY","o":"AE2607246","p":"0903080851-1","m":"LC1787","b":1,"s":[["UK 4",20,4],["UK 5",50,9],["UK 6",50,9],["UK 7",25,5],["UK 8",5,1],["UK 9",5,1]]},{"d":"01/09/2026","c":"GERMANY","o":"AE2607510","p":"0903083087-1","m":"LC1783","b":1,"s":[["UK 4",28,5],["UK 5",55,10],["UK 6",66,11],["UK 7",64,11],["UK 8",52,9],["UK 9",35,6]]},{"d":"01/09/2026","c":"GERMANY","o":"AE2607627","p":"0903081073-1","m":"LC1786","b":1,"s":[["UK 4",28,5],["UK 5",55,10],["UK 6",66,11],["UK 7",64,11],["UK 8",52,9],["UK 9",35,6]]},{"d":"01/09/2026","c":"GERMANY","o":"AE2607628","p":"0903081080-1","m":"LC1787","b":1,"s":[["UK 4",28,5],["UK 5",55,10],["UK 6",66,11],["UK 7",64,11],["UK 8",52,9],["UK 9",35,6]]},{"d":"17/09/2026","c":"UNITED ARAB EMIRATES","o":"AE2607351","p":"0903082772-1","m":"LC1783","b":1,"s":[["UK 3",6,1],["UK 4",20,4],["UK 5",27,5],["UK 6",32,6],["UK 7",22,4],["UK 8",12,2],["UK 9",4,1]]},{"d":"17/09/2026","c":"UNITED ARAB EMIRATES","o":"AE2607352","p":"0903082755-1","m":"LC1786","b":1,"s":[["UK 3",6,1],["UK 4",16,3],["UK 5",22,4],["UK 6",27,5],["UK 7",18,3],["UK 8",9,2],["UK 9",2,1]]},{"d":"17/09/2026","c":"UNITED ARAB EMIRATES","o":"AE2607353","p":"0903082783-1","m":"LC1787","b":1,"s":[["UK 3",6,1],["UK 4",16,3],["UK 5",22,4],["UK 6",27,5],["UK 7",18,3],["UK 8",9,2],["UK 9",2,1]]},{"d":"24/09/2026","c":"CANADA","o":"AE2607383","p":"0903082787-1","m":"LC1783","b":1,"s":[["UK 4",25,5],["UK 5",68,12],["UK 6",94,16],["UK 7",87,15],["UK 8",42,7],["UK 9",25,5]]},{"d":"26/10/2026","c":"CANADA","o":"AE2607426","p":"0903083862-1","m":"LC1783","b":1,"s":[["UK 4",31,6],["UK 5",71,12],["UK 6",94,16],["UK 7",83,14],["UK 8",48,8],["UK 9",23,4]]},{"d":"25/08/2026","c":"GERMANY","o":"AE2608048","p":"0903174790-1","m":"LC1783","b":2,"s":[["UK 4",108,18],["UK 5",218,37],["UK 6",278,47],["UK 7",193,33],["UK 8",110,19],["UK 9",39,7]]},{"d":"25/08/2026","c":"UNITED STATES","o":"AE2608049","p":"0903170086-1","m":"LC1783","b":2,"s":[["UK 5",70,12],["UK 6",97,17],["UK 7",86,15],["UK 8",59,10],["UK 9",34,6]]},{"d":"25/08/2026","c":"UNITED STATES","o":"AE2608050","p":"0903168738-1","m":"LC1783","b":2,"s":[["UK 4",82,14],["UK 5",109,19],["UK 6",143,24],["UK 7",139,24],["UK 8",84,14],["UK 9",79,14]]},{"d":"15/09/2026","c":"ARGENTINA","o":"AE2608051","p":"0903181596-1","m":"LC1783","b":2,"s":[["UK 3",7,1],["UK 4",40,7],["UK 5",71,12],["UK 6",77,13],["UK 7",58,10],["UK 8",34,5],["UK 9",13,2]]},{"d":"24/11/2026","c":"CHILE","o":"AE2608052","p":"0903178387-1","m":"LC1783","b":2,"s":[["UK 3",25,5],["UK 4",96,16],["UK 5",143,24],["UK 6",138,23],["UK 7",83,14],["UK 8",48,8],["UK 9",38,7]]},{"d":"24/10/2026","c":"UNITED KINGDOM","o":"AE2608053","p":"0903169937-1","m":"LC1785","b":2,"s":[["UK 4",45,23],["UK 5",95,48],["UK 6",135,68],["UK 7",73,37],["UK 8",43,22],["UK 9",29,15]]},{"d":"24/11/2026","c":"COLOMBIA","o":"AE2608054","p":"0903177670-1","m":"LC1785","b":2,"s":[["UK 4",40,7],["UK 5",116,20],["UK 6",174,29],["UK 7",128,22],["UK 8",91,16],["UK 9",1,1]]},{"d":"14/10/2026","c":"ARGENTINA","o":"AE2608055","p":"0903181623-1","m":"LC1785","b":2,"s":[["UK 4",64,11],["UK 5",111,18],["UK 6",119,20],["UK 7",76,13],["UK 8",41,7],["UK 9",8,1]]},{"d":"24/10/2026","c":"GERMANY","o":"AE2608056","p":"0903174909-1","m":"LC1786","b":2,"s":[["UK 4",59,10],["UK 5",64,11],["UK 6",70,12],["UK 7",67,12],["UK 8",40,7]]},{"d":"24/10/2026","c":"UNITED STATES","o":"AE2608057","p":"0903170110-1","m":"LC1786","b":2,"s":[["UK 4",70,12],["UK 5",123,21],["UK 6",169,29],["UK 7",140,24],["UK 8",75,13],["UK 9",37,7]]},{"d":"24/10/2026","c":"UNITED STATES","o":"AE2608058","p":"0903172161-1","m":"LC1786","b":2,"s":[["UK 4",30,5],["UK 5",71,12],["UK 6",98,17],["UK 7",87,15],["UK 8",60,10],["UK 9",34,6]]},{"d":"24/11/2026","c":"COLOMBIA","o":"AE2608059","p":"0903175642-1","m":"LC1786","b":2,"s":[["UK 3",5,1],["UK 4",54,9],["UK 5",122,21],["UK 6",174,29],["UK 7",134,23],["UK 8",92,16],["UK 9",1,1]]},{"d":"24/11/2026","c":"ARGENTINA","o":"AE2608060","p":"0903183146-1","m":"LC1786","b":2,"s":[["UK 3",7,1],["UK 4",41,7],["UK 5",72,12],["UK 6",80,14],["UK 7",55,9],["UK 8",32,5],["UK 9",13,2]]},{"d":"24/11/2026","c":"CHILE","o":"AE2608061","p":"0903171472-1","m":"LC1786","b":2,"s":[["UK 4",42,7],["UK 5",84,14],["UK 6",82,14],["UK 7",58,10],["UK 8",34,6]]},{"d":"24/10/2026","c":"UNITED STATES","o":"AE2608062","p":"0903172340-1","m":"LC1787","b":2,"s":[["UK 4",33,6],["UK 6",98,17],["UK 7",87,15],["UK 8",66,11],["UK 9",38,7]]},{"d":"24/10/2026","c":"UNITED STATES","o":"AE2608063","p":"0903172222-1","m":"LC1787","b":2,"s":[["UK 4",94,16],["UK 5",192,32],["UK 6",174,29],["UK 7",150,25],["UK 8",133,23],["UK 9",66,11]]},{"d":"24/11/2026","c":"COLOMBIA","o":"AE2608064","p":"0903175527-1","m":"LC1787","b":2,"s":[["UK 3",4,1],["UK 4",51,9],["UK 5",115,20],["UK 6",168,28],["UK 7",131,22],["UK 8",91,16],["UK 9",2,1]]},{"d":"24/11/2026","c":"ARGENTINA","o":"AE2608065","p":"0903181570-1","m":"LC1787","b":2,"s":[["UK 4",70,12],["UK 5",119,20],["UK 6",127,21],["UK 7",79,13],["UK 8",44,8],["UK 9",7,1]]},{"d":"24/11/2026","c":"CHILE","o":"AE2608066","p":"0903173724-1","m":"LC1787","b":2,"s":[["UK 3",20,4],["UK 4",78,13],["UK 5",116,20],["UK 6",108,18],["UK 7",76,13],["UK 8",52,9],["UK 9",30,5]]},{"d":"25/08/2026","c":"ITALY","o":"AE2608106","p":"0903171463-1","m":"LC1785","b":2,"s":[["UK 4",60,10],["UK 5",80,14],["UK 6",65,11],["UK 7",30,5],["UK 8",15,3],["UK 9",20,4]]},{"d":"09/11/2026","c":"GERMANY","o":"AE2608206","p":"0903174865-1","m":"LC1783","b":2,"s":[["UK 4",86,15],["UK 5",224,38],["UK 6",276,46],["UK 7",170,29],["UK 8",96,16],["UK 9",52,9]]},{"d":"09/11/2026","c":"GERMANY","o":"AE2608207","p":"0903174988-1","m":"LC1785","b":2,"s":[["UK 4",50,9],["UK 5",124,21],["UK 6",159,27],["UK 7",90,15],["UK 8",46,8],["UK 9",30,5]]},{"d":"09/11/2026","c":"GERMANY","o":"AE2608208","p":"0903186591-1","m":"LC1785","b":2,"s":[["UK 4",28,5],["UK 5",55,10],["UK 6",66,11],["UK 7",64,11],["UK 8",52,9],["UK 9",35,6]]},{"d":"09/11/2026","c":"GERMANY","o":"AE2608209","p":"0903174964-1","m":"LC1786","b":2,"s":[["UK 4",45,8],["UK 5",81,14],["UK 6",137,23],["UK 7",61,11],["UK 8",38,7],["UK 9",25,5]]},{"d":"09/11/2026","c":"GERMANY","o":"AE2608210","p":"0903174893-1","m":"LC1786","b":2,"s":[["UK 4",49,9],["UK 5",133,23],["UK 6",176,30],["UK 7",115,20],["UK 8",54,9],["UK 9",24,4]]},{"d":"09/11/2026","c":"GERMANY","o":"AE2608211","p":"0903174840-1","m":"LC1786","b":2,"s":[["UK 4",30,5],["UK 5",116,20],["UK 6",88,15],["UK 7",82,14],["UK 8",42,7],["UK 9",12,2]]},{"d":"24/09/2026","c":"UNITED STATES","o":"AE2608440","p":"0903172184-1","m":"LC1783","b":2,"s":[["UK 4",75,13],["UK 5",181,31],["UK 6",106,18],["UK 7",94,16],["UK 8",151,26],["UK 9",87,15]]},{"d":"09/11/2026","c":"GERMANY","o":"AE2608441","p":"0903171432-1","m":"LC1785","b":2,"s":[["UK 4",9,2],["UK 5",19,4],["UK 6",25,5],["UK 7",25,5],["UK 8",17,4],["UK 9",15,3]]},{"d":"24/09/2026","c":"UNITED STATES","o":"AE2608442","p":"0903170022-1","m":"LC1786","b":2,"s":[["UK 4",77,13],["UK 5",184,31],["UK 6",108,18],["UK 7",96,16],["UK 8",155,26],["UK 9",89,15]]},{"d":"24/09/2026","c":"UNITED STATES","o":"AE2608443","p":"0903172240-1","m":"LC1787","b":2,"s":[["UK 4",44,8],["UK 5",78,13],["UK 6",108,18],["UK 7",96,16]]},{"d":"01/10/2026","c":"GERMANY","o":"AE2608505","p":"0903174817-1","m":"LC1783","b":2,"s":[["UK 4",32,6],["UK 5",65,11],["UK 6",86,15],["UK 7",79,14],["UK 8",47,8],["UK 9",27,5]]},{"d":"01/10/2026","c":"JAPAN","o":"AE2608506","p":"0903174573-1","m":"LC1783","b":2,"s":[["UK 4",316,53],["UK 5",763,127],["UK 6",682,114],["UK 7",271,45],["UK 8",99,16],["UK 9",88,15]]},{"d":"01/10/2026","c":"JAPAN","o":"AE2608507","p":"0903174607-1","m":"LC1786","b":2,"s":[["UK 4",154,26],["UK 5",415,69],["UK 6",391,65],["UK 7",135,23],["UK 8",62,10],["UK 9",57,10]]},{"d":"26/10/2026","c":"UNITED STATES","o":"AE2608621","p":"0903172298-1","m":"LC1783","b":2,"s":[["UK 4",44,8],["UK 6",144,24],["UK 7",128,22]]},{"d":"26/10/2026","c":"CHILE","o":"AE2608622","p":"0903165517-1","m":"LC1785","b":2,"s":[["UK 3",30,5],["UK 4",45,8],["UK 5",48,8],["UK 6",45,8],["UK 7",42,7],["UK 8",45,8],["UK 9",45,8]]},{"d":"26/10/2026","c":"UNITED STATES","o":"AE2608623","p":"0903170042-1","m":"LC1786","b":2,"s":[["UK 4",45,8],["UK 6",146,25],["UK 7",130,22]]},{"d":"26/10/2026","c":"UNITED STATES","o":"AE2608624","p":"0903172321-1","m":"LC1787","b":2,"s":[["UK 4",45,8],["UK 5",106,18],["UK 6",146,25],["UK 7",130,22],["UK 8",179,30],["UK 9",103,18]]},{"d":"17/11/2026","c":"JAPAN","o":"AE2608670","p":"0903157306-1","m":"LC1783","b":2,"s":[["UK 4",68,11],["UK 5",211,35],["UK 6",224,38],["UK 7",82,14],["UK 8",43,7],["UK 9",43,7]]},{"d":"24/11/2026","c":"UNITED STATES","o":"AE2608695","p":"0903169999-1","m":"LC1783","b":2,"s":[["UK 4",38,7],["UK 5",106,18],["UK 6",147,25],["UK 7",130,22],["UK 8",165,28],["UK 9",95,16]]},{"d":"24/11/2026","c":"UNITED STATES","o":"AE2608696","p":"0903172267-1","m":"LC1786","b":2,"s":[["UK 4",39,7],["UK 5",108,18],["UK 6",149,25],["UK 7",133,23],["UK 8",168,28],["UK 9",97,17]]},{"d":"24/11/2026","c":"UNITED STATES","o":"AE2608697","p":"0903170068-1","m":"LC1787","b":2,"s":[["UK 5",108,18],["UK 6",149,25],["UK 7",133,23]]},{"d":"01/12/2026","c":"SOUTH AFRICA","o":"AE2608707","p":"4502069524-2","m":"LC1783","b":2,"s":[["UK 3",6,1],["UK 4",17,3],["UK 5",26,5],["UK 6",27,5],["UK 7",16,3],["UK 8",7,2],["UK 9",1,1]]},{"d":"01/12/2026","c":"SOUTH AFRICA","o":"AE2608708","p":"4502069052-2","m":"LC1786","b":2,"s":[["UK 3",10,2],["UK 4",17,3],["UK 5",26,5],["UK 6",26,5],["UK 7",13,3],["UK 8",7,2],["UK 9",1,1]]},{"d":"17/12/2026","c":"JAPAN","o":"AE2608735","p":"0903157336-1","m":"LC1783","b":2,"s":[["UK 4",32,5],["UK 5",115,19],["UK 6",115,19],["UK 7",40,7],["UK 8",29,5],["UK 9",29,5]]},{"d":"25/12/2026","c":"UNITED STATES","o":"AE2608765","p":"0903172198-1","m":"LC1783","b":2,"s":[["UK 5",91,16],["UK 6",126,21],["UK 7",112,19]]},{"d":"25/12/2026","c":"UNITED STATES","o":"AE2608766","p":"0903172280-1","m":"LC1786","b":2,"s":[["UK 5",92,16],["UK 6",128,22],["UK 7",114,19]]},{"d":"25/12/2026","c":"UNITED STATES","o":"AE2608767","p":"0903170134-1","m":"LC1787","b":2,"s":[["UK 4",39,7],["UK 5",92,16],["UK 6",128,22],["UK 7",114,19],["UK 8",78,13],["UK 9",45,8]]},{"d":"09/01/2027","c":"SOUTH AFRICA","o":"AE2608774","p":"4502069524-1","m":"LC1783","b":2,"s":[["UK 3",1,1],["UK 4",5,1],["UK 5",5,1],["UK 6",7,2],["UK 7",1,1],["UK 8",1,1]]},{"d":"09/01/2027","c":"SOUTH AFRICA","o":"AE2608775","p":"4502069052-1","m":"LC1786","b":2,"s":[["UK 3",1,1],["UK 4",5,1],["UK 5",5,1],["UK 6",7,2],["UK 7",1,1],["UK 8",1,1]]},{"d":"09/01/2027","c":"JAPAN","o":"AE2608790","p":"0903157367-1","m":"LC1783","b":2,"s":[["UK 4",32,5],["UK 5",115,19],["UK 6",115,19],["UK 7",40,7],["UK 8",29,5],["UK 9",29,5]]},{"d":"10/09/2026","c":"MEXICO","o":"AE2609319","p":"0903302990-1","m":"LC1783","b":3,"s":[["UK 4",74,13],["UK 5",172,29],["UK 6",177,30],["UK 7",87,15],["UK 8",35,6],["UK 9",5,1]]},{"d":"10/09/2026","c":"MEXICO","o":"AE2609320","p":"0903299085-1","m":"LC1783","b":3,"s":[["UK 5",4,1],["UK 6",4,1],["UK 7",4,1],["UK 8",2,1]]},{"d":"10/09/2026","c":"GERMANY","o":"AE2609321","p":"0903284030-1","m":"LC1784","b":3,"s":[["UK 4",49,9],["UK 5",119,20],["UK 6",141,24],["UK 7",80,14],["UK 8",44,8],["UK 9",26,5]]},{"d":"10/09/2026","c":"GERMANY","o":"AE2609322","p":"0903298474-1","m":"LC1784","b":3,"s":[["UK 4",28,5],["UK 5",55,10],["UK 6",66,11],["UK 7",64,11],["UK 8",52,9],["UK 9",35,6]]},{"d":"10/09/2026","c":"UNITED KINGDOM","o":"AE2609323","p":"0903298400-1","m":"LC1784","b":3,"s":[["UK 4",40,7],["UK 5",80,14],["UK 6",110,19],["UK 7",60,10],["UK 8",10,2]]},{"d":"10/09/2026","c":"UNITED KINGDOM","o":"AE2609324","p":"0903302381-1","m":"LC1784","b":3,"s":[["UK 4",32,16],["UK 5",68,34],["UK 6",96,48],["UK 7",52,26],["UK 8",31,16],["UK 9",21,11]]},{"d":"10/09/2026","c":"CANADA","o":"AE2609325","p":"0903304449-1","m":"LC1784","b":3,"s":[["UK 4",28,5],["UK 5",54,9],["UK 6",93,16],["UK 7",79,14],["UK 8",36,6],["UK 9",16,3]]},{"d":"10/09/2026","c":"MEXICO","o":"AE2609326","p":"0903300682-1","m":"LC1785","b":3,"s":[["UK 5",4,1],["UK 6",4,1],["UK 7",4,1],["UK 8",2,1]]},{"d":"10/09/2026","c":"MEXICO","o":"AE2609327","p":"0903298643-1","m":"LC1786","b":3,"s":[["UK 5",4,1],["UK 6",4,1],["UK 7",4,1],["UK 8",2,1]]},{"d":"10/09/2026","c":"MEXICO","o":"AE2609328","p":"0903298477-1","m":"LC1787","b":3,"s":[["UK 5",4,1],["UK 6",4,1],["UK 7",4,1],["UK 8",2,1]]},{"d":"02/10/2026","c":"JAPAN","o":"AE2609612","p":"0903302377-1","m":"LC1784","b":3,"s":[["UK 4",115,19],["UK 5",252,42],["UK 6",247,41],["UK 7",103,17],["UK 8",33,6],["UK 9",32,6]]},{"d":"25/09/2026","c":"BRAZIL","o":"AE2610792","p":"0903438863-1","m":"LC1783","b":4,"s":[["UK 4",29,6],["UK 5",38,8],["UK 6",94,19],["UK 7",59,12],["UK 8",53,11],["UK 9",27,6]]},{"d":"25/09/2026","c":"UNITED ARAB EMIRATES","o":"AE2610793","p":"0903426947-1","m":"LC1783","b":4,"s":[["UK 3",1,0],["UK 4",17,3],["UK 5",20,3],["UK 6",29,5],["UK 7",17,3],["UK 8",12,2],["UK 9",4,1]]},{"d":"10/10/2026","c":"THAILAND","o":"AE2610986","p":"0903430635-1","m":"LC1783","b":4,"s":[["UK 4",23,4],["UK 5",29,5],["UK 6",34,6],["UK 7",21,3],["UK 8",9,1],["UK 9",4,1]]},{"d":"14/11/2026","c":"CHINA","o":"AE2611306","p":"0903433970-1","m":"LC1783","b":4,"s":[["UK 5",2,1]]},{"d":"25/11/2026","c":"TAIWAN","o":"AE2611410","p":"0903437006-1","m":"LC1783","b":4,"s":[["UK 4",86,14],["UK 5",149,25],["UK 6",171,29],["UK 7",107,18],["UK 8",42,7],["UK 9",23,4]]},{"d":"10/12/2026","c":"CHINA","o":"AE2611517","p":"0903430180-1","m":"LC1783","b":4,"s":[["UK 3",100,17],["UK 4",191,32],["UK 5",225,38],["UK 6",217,37],["UK 7",137,23],["UK 8",7,2],["UK 9",1,1]]},{"d":"30/12/2026","c":"CHINA","o":"AE2611564","p":"0903432428-1","m":"LC1783","b":4,"s":[["UK 3",30,5],["UK 4",152,26],["UK 5",191,32],["UK 6",82,14],["UK 7",39,7],["UK 8",11,2],["UK 9",17,3]]},{"d":"09/01/2027","c":"BRAZIL","o":"AE2611605","p":"0903440420-1","m":"LC1783","b":4,"s":[["UK 4",54,11],["UK 5",54,11],["UK 6",162,33],["UK 7",109,22],["UK 8",109,22],["UK 9",54,11]]},{"d":"09/10/2026","c":"MEXICO","o":"AD2600003","p":"0903528656-1","m":"LC1786","b":5,"s":[["UK 4",58,12],["UK 5",145,29],["UK 6",152,31],["UK 7",74,15],["UK 8",27,6],["UK 9",4,1]]},{"d":"09/10/2026","c":"BRAZIL","o":"AD2600004","p":"0903528648-1","m":"LC1786","b":5,"s":[["UK 4",7,2],["UK 5",43,9],["UK 6",170,34],["UK 7",102,21],["UK 8",37,8],["UK 9",4,1]]},{"d":"09/10/2026","c":"CHILE","o":"AD2600005","p":"0903527887-1","m":"LC1786","b":5,"s":[["UK 3",35,7],["UK 4",74,15],["UK 5",98,20],["UK 6",94,19],["UK 7",78,16],["UK 8",70,14],["UK 9",53,11]]},{"d":"01/04/2027","c":"KOREA","o":"AD2600010","p":"0903529193-1","m":"LC1786","b":5,"s":[["UK 4",558,93],["UK 5",998,167],["UK 6",810,135],["UK 7",423,71],["UK 8",136,23],["UK 9",25,5]]},{"d":"09/10/2026","c":"MEXICO","o":"AD2600006","p":"0903528670-1","m":"LC1787","b":5,"s":[["UK 4",36,8],["UK 5",93,19],["UK 6",102,21],["UK 7",49,10],["UK 8",16,4],["UK 9",4,1]]},{"d":"01/04/2027","c":"KOREA","o":"AD2600011","p":"0903527614-1","m":"LC1787","b":5,"s":[["UK 4",527,88],["UK 5",957,160],["UK 6",784,131],["UK 7",413,69],["UK 8",134,23],["UK 9",25,5]]},{"d":"16/01/2027","c":"CHINA","o":"AD2600007","p":"0903528797-1","m":"LC1783","b":5,"s":[["UK 4",38,7],["UK 5",93,19],["UK 6",75,15],["UK 7",29,6],["UK 8",15,3]]},{"d":"01/04/2027","c":"KOREA","o":"AD2600008","p":"0903527552-1","m":"LC1783","b":5,"s":[["UK 4",1876,313],["UK 5",3132,522],["UK 6",2442,407],["UK 7",1296,216],["UK 8",396,66],["UK 9",78,13]]},{"d":"01/04/2027","c":"KOREA","o":"AD2600009","p":"0903525126-1","m":"LC1784","b":5,"s":[["UK 4",938,157],["UK 5",1628,272],["UK 6",1325,221],["UK 7",743,124],["UK 8",196,33],["UK 9",50,9]]},{"d":"24/10/2026","c":"ARGENTINA","o":"AD2600016","p":"0903590066-1","m":"LC1787","b":3,"s":[["UK 5",1,0],["UK 6",2,1]]}],
  workstations: [
      {
        id: 'CAN_VAI',
        lineGroup: 'Chuyền Cán Vải',
        name: '1. Chuyền Cán Vải',
        shortName: 'Cán Vải',
        totalHeadcount: 9,
        targetDailyLvf: 650,
        normCapacity: 2650,
        actualToday: 650,
        pohPercent: 95.5,
        oeePercent: 92.4,
        activeHoursPerDay: 3.5,
        trend7d: [88, 90, 91, 93, 94, 95, 95.5],
        scheduleRule: 'Cán vải 2 lần/tuần (2-3h/ngày); In tẩy & Chặt tẩy+quai 3 ngày/tuần; Mài quai 650đ/ngày',
        leadTimeRule: 'Đồng bộ định mức vật tư theo Lệnh Cán chặt may LVF',
        status: 'optimal',
        statusLabel: 'Gom lô 5M (POH 95.5%)',
        kaizenNote: 'Công đoạn để ra được SP tối thiểu từ 5-6 người, thời gian làm việc chỉ mất 2-3h/ngày (năng lực 2650đ vs LVF cần 650đ). Thuật toán 5M gom lô Cán vải 2 buổi/tuần, điều chuyển nhân sự sang phụ Kiểm chặt & Mài đế trong giờ hành chính.',
        subProcesses: [
          {
            stepCode: 'CV-S1', stepOrder: 1,
            name: 'Cán vải cao su (Fabric Calendaring)',
            workers: 6,
            normDesc: '5-6 NS / 2.650 đôi/ngày (Thực tế LVF cần 650đ/ngày → Cán 2 lần/tuần, 2-3h/ngày)',
            normDaily: 2650, actualToday: 1350, runSchedule: '2 lần/tuần (2.5h/ngày)',
            inputMaterial: 'Vải lót cuộn + Cao su hỗn luyện (`BTP-LK-04`)',
            btpCode: 'BTP-CV-01', btpName: 'Vải cán cao su tấm (Rubberized Fabric Sheet)',
            btpUnit: 'Đôi quy đổi', wipStock: 2450, qcRate: 99.3, nextStep: 'In Tẩy & Chặt Tẩy + Quai'
          },
          {
            stepCode: 'CV-S2', stepOrder: 2,
            name: 'In Tẩy (Insole Label/Sizing Printing)',
            workers: 4,
            normDesc: '4 NS / 1.340 đôi/ngày (Chạy 3 ngày/tuần → 650 đôi / 2h / ngày)',
            normDaily: 1340, actualToday: 680, runSchedule: '3 ngày/tuần (2h/ngày)',
            inputMaterial: 'Vải cán cao su tấm (`BTP-CV-01`) + Mực in',
            btpCode: 'BTP-CV-02', btpName: 'Tấm vải in tẩy (Printed Insole Sheet)',
            btpUnit: 'Đôi', wipStock: 1680, qcRate: 98.9, nextStep: 'Chặt tẩy + quai'
          },
          {
            stepCode: 'CV-S3', stepOrder: 3,
            name: 'Chặt tẩy + quai (Insole & Strap Die-Cutting)',
            workers: 1,
            normDesc: '1 NS / 1.470 đôi/ngày (Chạy 3 ngày/tuần)',
            normDaily: 1470, actualToday: 710, runSchedule: '3 ngày/tuần (3.5h/ngày)',
            inputMaterial: 'Tấm vải in tẩy (`BTP-CV-02`)',
            btpCode: 'BTP-CV-03', btpName: 'BTP Tẩy & Quai vải đã chặt (Cut Insole & Strap)',
            btpUnit: 'Đôi', wipStock: 1520, qcRate: 99.5, nextStep: 'Mài Quai & Đóng bộ giao LVF'
          },
          {
            stepCode: 'CV-S4', stepOrder: 4,
            name: 'Mài Quai (Strap Skiving/Buffing)',
            workers: 2,
            normDesc: '2 NS / 650 đôi/ngày (Làm hàng ngày khớp nhịp LVF)',
            normDaily: 650, actualToday: 650, runSchedule: 'Hàng ngày (8h HC)',
            inputMaterial: 'Quai vải đã chặt (`BTP-CV-03`)',
            btpCode: 'BTP-CV-04', btpName: 'BTP Quai ủng đã mài nhám (Buffed Boot Strap)',
            btpUnit: 'Đôi', wipStock: 1140, qcRate: 99.1, nextStep: 'Bàn giao sang LVF (Lệnh Cán chặt may)'
          },
          {
            stepCode: 'CV-S5', stepOrder: 5,
            name: 'Gia công Chi tiết phụ kiện vải',
            workers: 1,
            normDesc: '1 NS / 5.000 chi tiết/ngày (~1.250 đôi/ngày)',
            normDaily: 1250, actualToday: 880, runSchedule: 'Theo lệnh đồng bộ',
            inputMaterial: 'Vải cán cao su (`BTP-CV-01`)',
            btpCode: 'BTP-CV-05', btpName: 'BTP Chi tiết phụ kiện vải cán (Fabric Accessories)',
            btpUnit: 'Đôi quy đổi', wipStock: 1940, qcRate: 99.6, nextStep: 'Bàn giao sang LVF'
          }
        ]
      },
      {
        id: 'IN_LUA',
        lineGroup: 'Chuyền In Lụa',
        name: '2. Chuyền In Lụa',
        shortName: 'In Lụa',
        totalHeadcount: 7,
        targetDailyLvf: 650,
        normCapacity: 750,
        actualToday: 655,
        pohPercent: 93.2,
        oeePercent: 90.8,
        activeHoursPerDay: 7.2,
        trend7d: [82, 84, 86, 89, 91, 92.5, 93.2],
        scheduleRule: '1 Thợ in chính + 6 Thợ phụ = 750 đôi/ngày; Thực tế LVF cần 400-650 đôi/ngày',
        leadTimeRule: 'Cao su nhập kho trước 12h mới in; Sau in nhập kho ủ đủ 24h mới giao LVF',
        status: 'optimal',
        statusLabel: 'Chuẩn nhập <12h & Ủ 24h',
        kaizenNote: 'Cao su phải nhập kho trước 12h mới tiến hành in; Cao su in phải nhập kho 24h mới giao qua LVF. Kế hoạch 5M gom các PO cùng mã màu (LC1783/LC1786) in đủ 650-700đ/ca trong giới hạn bồn ủ 24h.',
        subProcesses: [
          {
            stepCode: 'IL-S1', stepOrder: 1,
            name: 'Tiếp nhận & Kiểm phôi cao su trước 12h trưa',
            workers: 1,
            normDesc: 'Kiểm soát lô BTP cao su chặt nhập kho trước 12:00 để ổn định bề mặt',
            normDaily: 750, actualToday: 670, runSchedule: 'Trước 12:00 hàng ngày',
            inputMaterial: 'BTP Cao su chặt (`BTP-TC-05`)',
            btpCode: 'BTP-IL-01', btpName: 'Phôi cao su đạt chuẩn nhập trước 12h (Pre-12h Verified Blank)',
            btpUnit: 'Đôi', wipStock: 1080, qcRate: 99.4, nextStep: 'Vệ sinh & Dán định vị'
          },
          {
            stepCode: 'IL-S2', stepOrder: 2,
            name: 'Vệ sinh bề mặt & Dán cử định vị (Thợ phụ)',
            workers: 5,
            normDesc: 'Thợ phụ vệ sinh & dán định vị: 3.500 chi tiết/ngày (~750 đôi/ngày theo thợ in)',
            normDaily: 750, actualToday: 665, runSchedule: 'Theo nhịp thợ in chính',
            inputMaterial: 'Phôi cao su (`BTP-IL-01`) + Dung môi vệ sinh + Băng keo cử',
            btpCode: 'BTP-IL-02', btpName: 'BTP Cao su đã vệ sinh & dán định vị (Cleaned & Positioned Part)',
            btpUnit: 'Đôi', wipStock: 1020, qcRate: 99.2, nextStep: 'In lụa logo/hoa văn'
          },
          {
            stepCode: 'IL-S3', stepOrder: 3,
            name: 'In lụa chi tiết / Logo thương hiệu (Thợ in chính)',
            workers: 1,
            normDesc: '1 Thợ in chính (phối hợp 6 phụ): Định mức 750 đôi/ngày (LVF cần 400-650đ)',
            normDaily: 750, actualToday: 655, runSchedule: 'Ca hành chính',
            inputMaterial: 'BTP đã dán định vị (`BTP-IL-02`) + Mực cao su chuyên dụng',
            btpCode: 'BTP-IL-03', btpName: 'BTP Cao su vừa in lụa trên kệ phơi (Freshly Printed Rubber Part)',
            btpUnit: 'Đôi', wipStock: 980, qcRate: 98.6, nextStep: 'Ủ khô lưu kho 24h'
          },
          {
            stepCode: 'IL-S4', stepOrder: 4,
            name: 'Ủ khô & Lưu kho đủ 24 giờ trước khi giao LVF',
            workers: 0,
            normDesc: 'Bắt buộc lưu kho 24h để mực cao su liên kết hoàn toàn trước khi gò/hấp',
            normDaily: 750, actualToday: 655, runSchedule: 'Lưu kho 24h liên tục',
            inputMaterial: 'BTP Cao su vừa in (`BTP-IL-03`)',
            btpCode: 'BTP-IL-04', btpName: 'BTP Cao su in lụa đã ủ đủ 24h (24h-Cured Printed BTP)',
            btpUnit: 'Đôi', wipStock: 940, qcRate: 99.5, nextStep: 'Bàn giao sang LVF'
          }
        ]
      },
      {
        id: 'LUYEN_KIN',
        lineGroup: 'Chuyền Cán Luyện',
        name: '3. Cán Luyện — Luyện Kín',
        shortName: 'Luyện Kín',
        totalHeadcount: 7,
        targetDailyLvf: 650,
        normCapacity: 800,
        actualToday: 740,
        pohPercent: 96.2,
        oeePercent: 94.0,
        activeHoursPerDay: 7.6,
        trend7d: [90, 92, 93, 94, 95, 95.8, 96.2],
        scheduleRule: 'Đứng máy luyện kín 16 mẻ/ngày; Cán xả tấm 16-32 mẻ/ngày; Cán vào thuốc đế 3 ngày/tuần',
        leadTimeRule: 'Cấp phôi cao su hỗn luyện trước cho Ép đế (-14 ngày) & Cán đùn (-48h)',
        status: 'optimal',
        statusLabel: 'Đạt 16 mẻ/ngày (96.2%)',
        kaizenNote: 'Có những ngày không đủ vật tư thì không luyện kín và điều chuyển nhân sự tập trung cán xả ép zem và ra đế để duy trì POH 100%.',
        subProcesses: [
          {
            stepCode: 'LK-S1', stepOrder: 1,
            name: 'Nhận hóa chất (1h/ngày) & Đánh dẻo cao su (3 ngày/tuần)',
            workers: 1,
            normDesc: '1 NS: Nhận cân hóa chất 1h/ngày + Đánh dẻo cao su 3 ngày/tuần',
            normDaily: 850, actualToday: 800, runSchedule: '1h/ngày + 3 ngày/tuần',
            inputMaterial: 'Cao su thiên nhiên/tổng hợp + Hóa chất phối liệu',
            btpCode: 'BTP-LK-01', btpName: 'Cao su đánh dẻo & Mẻ cân hóa chất (Masticated Rubber & Batch)',
            btpUnit: 'Đôi quy đổi (16 mẻ)', wipStock: 1460, qcRate: 99.8, nextStep: 'Đứng máy luyện kín'
          },
          {
            stepCode: 'LK-S2', stepOrder: 2,
            name: 'Đứng máy luyện kín (Internal Kneader Mixing)',
            workers: 1,
            normDesc: '1 NS / 16 mẻ/ngày (~800 đôi quy đổi/ngày)',
            normDaily: 800, actualToday: 760, runSchedule: '16 mẻ/ngày',
            inputMaterial: 'Cao su đánh dẻo + Hóa chất (`BTP-LK-01`)',
            btpCode: 'BTP-LK-02', btpName: 'Cao su hỗn luyện kín (Masterbatch Compound)',
            btpUnit: 'Đôi quy đổi', wipStock: 1380, qcRate: 99.2, nextStep: 'Cán xả tấm lần 1'
          },
          {
            stepCode: 'LK-S3', stepOrder: 3,
            name: 'Cán xả tấm lần 1 (1st Sheet-Off Mill)',
            workers: 2,
            normDesc: '2 NS / Định mức 32 mẻ/ngày (Thực tế chạy 16 mẻ / 4h / ngày)',
            normDaily: 800, actualToday: 750, runSchedule: '16 mẻ / 4h / ngày',
            inputMaterial: 'Cao su hỗn luyện kín (`BTP-LK-02`)',
            btpCode: 'BTP-LK-03', btpName: 'Cao su tấm cán xả lần 1 (1st Pass Sheeted Compound)',
            btpUnit: 'Đôi quy đổi', wipStock: 1320, qcRate: 99.3, nextStep: 'Cán xả tấm lần 2'
          },
          {
            stepCode: 'LK-S4', stepOrder: 4,
            name: 'Cán xả tấm lần 2 (2nd Refining Sheet-Off Mill)',
            workers: 2,
            normDesc: '2 NS / 32 mẻ/ngày',
            normDaily: 800, actualToday: 745, runSchedule: '16-32 mẻ/ngày',
            inputMaterial: 'Cao su tấm lần 1 (`BTP-LK-03`)',
            btpCode: 'BTP-LK-04', btpName: 'Cao su tấm tinh luyện lần 2 (2nd Pass Refined Sheet)',
            btpUnit: 'Đôi quy đổi', wipStock: 1290, qcRate: 99.4, nextStep: 'Cán vào thuốc đế / Cán đùn / Cán vải'
          },
          {
            stepCode: 'LK-S5', stepOrder: 5,
            name: 'Cán vào thuốc đế (Outsole Accelerator Mixing)',
            workers: 4,
            normDesc: '4 NS / 3 ngày/tuần (3 mẻ / 1h / ngày)',
            normDaily: 750, actualToday: 740, runSchedule: '3 ngày/tuần (3 mẻ/1h)',
            inputMaterial: 'Cao su tấm lần 2 (`BTP-LK-04`) + Lưu huỳnh/Xúc tiến',
            btpCode: 'BTP-LK-05', btpName: 'Phôi cao su vào thuốc đế (Activated Outsole Compound)',
            btpUnit: 'Đôi quy đổi', wipStock: 1410, qcRate: 99.1, nextStep: 'Tổ Ép Đế'
          }
        ]
      },
      {
        id: 'EP_DE',
        lineGroup: 'Chuyền Cán Luyện',
        name: '4. Cán Luyện — Ép Đế',
        shortName: 'Ép Đế',
        totalHeadcount: 10,
        targetDailyLvf: 650,
        normCapacity: 450,
        actualToday: 650,
        pohPercent: 98.4,
        oeePercent: 95.2,
        activeHoursPerDay: 10.5,
        trend7d: [89, 91, 93, 95, 96.5, 97.8, 98.4],
        scheduleRule: '5 NS / 450 đôi/ngày / 12 khuôn (40đ/khuôn/ngày); Cắt tỉa 950đ/ngày; Ủi bia 500đ/ngày',
        leadTimeRule: 'Triển khai ép đế trước 2 tuần (-14 ngày), tối thiểu trước 3 ngày so với ngày Gò',
        status: 'bottleneck',
        statusLabel: 'Đã bù khuôn & Ép trước 14d',
        kaizenNote: 'Năng lực giờ HC là 450đ/12 khuôn. Thuật toán 5M phân bổ 12 khuôn theo tỷ lệ Size thật (UK 6: 3 khuôn, UK 5: 3 khuôn, UK 7: 2 khuôn, UK 4: 2 khuôn, UK 8: 1 khuôn, UK 3+9: 1 khuôn) kết hợp ép trước 14 ngày đạt 650đ/ngày.',
        subProcesses: [
          {
            stepCode: 'ED-S1', stepOrder: 1,
            name: 'Cân cao su phôi đế (Outsole Preform Weighing)',
            workers: 1,
            normDesc: '1 NS cân cao su theo từng cỡ UK 3 – UK 9 (thuộc cụm 5 NS ép đế)',
            normDaily: 650, actualToday: 660, runSchedule: 'Ca HC + Tăng ca kế hoạch',
            inputMaterial: 'Phôi cao su vào thuốc đế (`BTP-LK-05`)',
            btpCode: 'BTP-ED-01', btpName: 'Phôi cao su đế đã cân định lượng (Weighed Outsole Preform)',
            btpUnit: 'Đôi', wipStock: 1850, qcRate: 99.5, nextStep: 'Ép đế 12 khuôn'
          },
          {
            stepCode: 'ED-S2', stepOrder: 2,
            name: 'Ép đế nhiệt thủy lực (12 Khuôn - Phân bổ chuẩn UK 3..UK 9)',
            workers: 3,
            normDesc: '3 NS đứng máy ép / 450 đôi giờ HC → 650 đôi/ngày theo lịch 5M trước 14 ngày',
            normDaily: 450, actualToday: 650, runSchedule: 'Triển khai trước 14 ngày',
            inputMaterial: 'Phôi cao su đế đã cân (`BTP-ED-01`)',
            btpCode: 'BTP-ED-02', btpName: 'Đế cao su thô sau ép (Raw Molded Outsole)',
            btpUnit: 'Đôi', wipStock: 1780, qcRate: 97.8, nextStep: 'Kiểm đế tại chuyền ép'
          },
          {
            stepCode: 'ED-S3', stepOrder: 3,
            name: 'Kiểm chất lượng đế sau ép (In-line Outsole QC)',
            workers: 1,
            normDesc: '1 NS kiểm (thuộc cụm 5 NS ép đế)',
            normDaily: 650, actualToday: 650, runSchedule: 'Song song máy ép',
            inputMaterial: 'Đế cao su thô sau ép (`BTP-ED-02`)',
            btpCode: 'BTP-ED-03', btpName: 'Đế ép đạt QC sơ bộ (QC-Passed Molded Outsole)',
            btpUnit: 'Đôi', wipStock: 1720, qcRate: 98.4, nextStep: 'Cắt tỉa bavia đế'
          },
          {
            stepCode: 'ED-S4', stepOrder: 4,
            name: 'Cắt tỉa bavia đế (Flash Trimming)',
            workers: 1,
            normDesc: '1 NS / 950 đôi/ngày',
            normDaily: 950, actualToday: 680, runSchedule: 'Ca hành chính',
            inputMaterial: 'Đế ép đạt QC (`BTP-ED-03`)',
            btpCode: 'BTP-ED-04', btpName: 'Đế cao su đã cắt tỉa bavia (Trimmed Outsole)',
            btpUnit: 'Đôi', wipStock: 1660, qcRate: 99.3, nextStep: 'Ủi bia cạnh đế'
          },
          {
            stepCode: 'ED-S5', stepOrder: 5,
            name: 'Ủi bia cạnh đế (Edge Finishing / Ủi bia)',
            workers: 1,
            normDesc: '1 NS / 500 đôi/ngày (+1 NS luân chuyển hỗ trợ 2h/ngày đạt 650đ)',
            normDaily: 500, actualToday: 650, runSchedule: 'Ca HC + Hỗ trợ 5M',
            inputMaterial: 'Đế đã cắt tỉa (`BTP-ED-04`)',
            btpCode: 'BTP-ED-05', btpName: 'BTP Đế hoàn thiện sau ép chuyển Mài Đế (Finished Molded Outsole)',
            btpUnit: 'Đôi', wipStock: 1580, qcRate: 99.2, nextStep: 'Tổ Mài Đế'
          }
        ]
      },
      {
        id: 'MAI_DE',
        lineGroup: 'Chuyền Cán Luyện',
        name: '5. Cán Luyện — Mài Đế',
        shortName: 'Mài Đế',
        totalHeadcount: 8,
        targetDailyLvf: 650,
        normCapacity: 600,
        actualToday: 650,
        pohPercent: 95.1,
        oeePercent: 91.6,
        activeHoursPerDay: 8.0,
        trend7d: [85, 87, 89, 91, 93, 94.2, 95.1],
        scheduleRule: 'Đánh kẽm 450đ/ngày (1 NS), Mài logo (1 NS), Mài tay 132đ/người x 5 NS = 660đ, Vệ sinh (1 NS)',
        leadTimeRule: 'Bắt buộc hoàn thành trước 3 ngày (72h) so với ngày vào Gò LVF',
        status: 'optimal',
        statusLabel: 'Hoàn thành trước Gò 3 ngày',
        kaizenNote: 'Để đáp ứng kế hoạch xuất hàng và chủ động khi thay đổi, Mài đế luôn hoàn thành trước 3 ngày so với ngày vào gò LVF. Khâu Đánh kẽm (450đ) được bổ sung 1 NS luân chuyển từ Luyện kín/Cán vải trong 2.5h để đạt 650đ/ngày.',
        subProcesses: [
          {
            stepCode: 'MD-S1', stepOrder: 1,
            name: 'Đánh kẽm lòng đế (Wire Brushing / Roughing)',
            workers: 1,
            normDesc: '1 NS / 450 đôi/ngày (+Hỗ trợ luân chuyển 5M đạt 650 đôi/ngày)',
            normDaily: 450, actualToday: 650, runSchedule: 'Trước ngày Gò >= 3 ngày',
            inputMaterial: 'BTP Đế sau ủi bia (`BTP-ED-05`)',
            btpCode: 'BTP-MD-01', btpName: 'Đế đã đánh kẽm tạo nhám (Wire-Brushed Outsole)',
            btpUnit: 'Đôi', wipStock: 1320, qcRate: 99.1, nextStep: 'Mài logo đế'
          },
          {
            stepCode: 'MD-S2', stepOrder: 2,
            name: 'Mài vị trí gắn Logo (Logo Spot Buffing)',
            workers: 1,
            normDesc: '1 NS / 650 đôi/ngày',
            normDaily: 650, actualToday: 650, runSchedule: 'Trước ngày Gò >= 3 ngày',
            inputMaterial: 'Đế đã đánh kẽm (`BTP-MD-01`)',
            btpCode: 'BTP-MD-02', btpName: 'Đế đã mài chuẩn vị trí logo (Logo-Buffed Outsole)',
            btpUnit: 'Đôi', wipStock: 1290, qcRate: 99.3, nextStep: 'Mài tay viền đế'
          },
          {
            stepCode: 'MD-S3', stepOrder: 3,
            name: 'Mài tay chi tiết viền & gót đế (5 NS x 132 đôi/ngày)',
            workers: 5,
            normDesc: '5 NS x 132 đôi/ngày/người = 660 đôi/ngày',
            normDaily: 660, actualToday: 655, runSchedule: 'Trước ngày Gò >= 3 ngày',
            inputMaterial: 'Đế đã mài logo (`BTP-MD-02`)',
            btpCode: 'BTP-MD-03', btpName: 'Đế đã mài tay hoàn chỉnh (Hand-Buffed Outsole)',
            btpUnit: 'Đôi', wipStock: 1260, qcRate: 98.9, nextStep: 'Vệ sinh đế hoàn thiện'
          },
          {
            stepCode: 'MD-S4', stepOrder: 4,
            name: 'Vệ sinh bụi đế & Đóng bộ theo Size UK 3..UK 9 chờ giao LVF',
            workers: 1,
            normDesc: '1 NS / 650 đôi/ngày',
            normDaily: 650, actualToday: 650, runSchedule: 'Nhập kho trước Gò 3 ngày',
            inputMaterial: 'Đế đã mài tay (`BTP-MD-03`)',
            btpCode: 'BTP-MD-04', btpName: 'BTP Đế mài sạch sẵn sàng giao LVF (Clean Buffed Outsole)',
            btpUnit: 'Đôi', wipStock: 1240, qcRate: 99.6, nextStep: 'Bàn giao sang LVF (Lệnh Gò)'
          }
        ]
      },
      {
        id: 'CAN_DUN',
        lineGroup: 'Chuyền Cán Luyện',
        name: '6. Cán Luyện — Cán Đùn',
        shortName: 'Cán Đùn',
        totalHeadcount: 11,
        targetDailyLvf: 650,
        normCapacity: 750,
        actualToday: 660,
        pohPercent: 92.0,
        oeePercent: 89.5,
        activeHoursPerDay: 7.4,
        trend7d: [79, 82, 85, 87, 89, 91, 92.0],
        scheduleRule: 'Máy 2 trục (3 máy - 2560kg); Máy 5 trục (2 máy - 500đ/máy); Máy đùn (2 máy - 500đ); Máy 3 trục (1 máy - 3h/ngày)',
        leadTimeRule: 'Bắt buộc hoàn thành và nhập kho trước ngày Gò LVF 48 giờ',
        status: 'warning',
        statusLabel: 'Chiến dịch 5 Màu & Trước 48h',
        kaizenNote: 'Nhờ gom chiến dịch theo 5 mã màu thật (LC1783: 29.046đ, LC1786: 15.218đ, LC1787: 10.364đ, LC1784: 7.327đ, LC1785: 2.882đ), số lần vệ sinh máy 5 trục và thay đầu ói máy đùn giảm 60%, đảm bảo nhập kho trước Gò 48h.',
        subProcesses: [
          {
            stepCode: 'CD-S1', stepOrder: 1,
            name: 'Máy cán 2 trục (3 máy: Cấp liệu ép zem & Chạy tẩy hấp)',
            workers: 2,
            normDesc: '2 NS / 3 máy (32 mẻ/ngày/máy = 2.560 kg; 1 máy cấp máy 5 trục full giờ, 1 máy cấp máy ói & tẩy hấp 4h/ngày)',
            normDaily: 850, actualToday: 750, runSchedule: 'Full ca + 4h/ngày',
            inputMaterial: 'Cao su tấm tinh luyện (`BTP-LK-04`)',
            btpCode: 'BTP-CD-01', btpName: 'Cao su dải nóng ép zem & BTP Tẩy hấp (Warm Feed Strip & Sponge Insole)',
            btpUnit: 'Đôi quy đổi', wipStock: 1210, qcRate: 98.8, nextStep: 'Máy 5 trục & Máy đùn'
          },
          {
            stepCode: 'CD-S2', stepOrder: 2,
            name: 'Máy cán 5 trục (2 máy: Cán tấm cao su mặt ủng theo 5 mã màu)',
            workers: 8,
            normDesc: '8 NS / 2 máy (500 đôi/máy/ngày; 1 máy chạy full giờ, 1 máy chạy 2-3h/ngày)',
            normDaily: 750, actualToday: 670, runSchedule: 'Trước ngày Gò >= 48h',
            inputMaterial: 'Cao su ép zem từ máy 2 trục (`BTP-CD-01`)',
            btpCode: 'BTP-CD-02', btpName: 'BTP Cao su tấm cán 5 trục (5-Roll Calendered Upper Sheet)',
            btpUnit: 'Đôi quy đổi', wipStock: 1120, qcRate: 96.4, nextStep: 'Tổ Chặt (Chặt thân/mũi/phụ kiện)'
          },
          {
            stepCode: 'CD-S3', stepOrder: 3,
            name: 'Máy đùn / Máy ói (2 máy: Đùn viền foxing & chi tiết)',
            workers: 3,
            normDesc: '3 NS / 2 máy (500 đôi chi tiết/ngày/máy; vệ sinh đầu ói theo chiến dịch màu)',
            normDaily: 700, actualToday: 660, runSchedule: 'Trước ngày Gò >= 48h',
            inputMaterial: 'Cao su cấp từ máy 2 trục (`BTP-CD-01`)',
            btpCode: 'BTP-CD-03', btpName: 'BTP Dải viền cao su đùn / Foxing (Extruded Foxing Strip)',
            btpUnit: 'Đôi', wipStock: 1095, qcRate: 97.2, nextStep: 'Nhập kho 48h → Giao LVF'
          },
          {
            stepCode: 'CD-S4', stepOrder: 4,
            name: 'Máy cán 3 trục (1 máy: Cán tấm phụ trợ / nẹp)',
            workers: 3,
            normDesc: '3 NS / 1 máy (Thời gian hoạt động 3h/ngày)',
            normDaily: 750, actualToday: 680, runSchedule: '3h/ngày (Trước Gò 48h)',
            inputMaterial: 'Cao su tấm (`BTP-LK-04`)',
            btpCode: 'BTP-CD-04', btpName: 'BTP Cao su tấm 3 trục (3-Roll Reinforcement Sheet)',
            btpUnit: 'Đôi quy đổi', wipStock: 1150, qcRate: 98.7, nextStep: 'Tổ Chặt (Chặt nẹp gót/mũi)'
          }
        ]
      },
      {
        id: 'TO_CHAT',
        lineGroup: 'Chuyền Cán Luyện',
        name: '7. Cán Luyện — Tổ Chặt (8 Máy)',
        shortName: 'Tổ Chặt',
        totalHeadcount: 11,
        targetDailyLvf: 650,
        normCapacity: 500,  // AUDIT 02/11/2026: Excel LAF — khâu Kiểm chỉ 500đ/ngày là nghẽn thật của Tổ Chặt, không phải 650 (650 là nhu cầu LVF).
        actualToday: 645,
        pohPercent: 93.0,
        oeePercent: 91.2,
        activeHoursPerDay: 8.0,
        trend7d: [80, 83, 85, 88, 90, 91.8, 93.0],
        scheduleRule: '8 Máy chặt (1 thân, 1 mũi, 1 nẹp gót, 4 phụ kiện) đạt định mức; 2 NS Kiểm + 1 NS hỗ trợ 5M (650 đôi/ngày)',
        leadTimeRule: 'Kiểm đồng bộ bộ chi tiết chặt theo Size UK 3..9 trước khi qua In lụa / Giao LVF (trước 48h)',
        status: 'optimal',
        statusLabel: 'Đã cân bằng Kiểm đồng bộ',
        kaizenNote: 'Khâu Kiểm hàng (2 thợ kiểm song song ban đầu đạt 500đ/ngày) đã được Thuật toán 5M bổ sung khay phân loại theo Size UK 3..9 và 1 NS luân chuyển từ Cán vải những ngày nghỉ cán, nâng công suất kiểm đồng bộ lên 645-650 đôi/ngày.',
        subProcesses: [
          {
            stepCode: 'TC-S1', stepOrder: 1,
            name: 'Chặt thân ủng (1 Máy chặt thân)',
            workers: 1,
            normDesc: '1 NS / 1 máy chặt thân (Đạt định mức P. Khai Phát)',
            normDaily: 700, actualToday: 675, runSchedule: 'Ca hành chính',
            inputMaterial: 'Cao su tấm 5 trục (`BTP-CD-02`)',
            btpCode: 'BTP-TC-01', btpName: 'BTP Thân ủng cao su đã chặt (Die-Cut Boot Shaft)',
            btpUnit: 'Đôi', wipStock: 1090, qcRate: 97.5, nextStep: 'Kiểm & Đồng bộ chi tiết chặt'
          },
          {
            stepCode: 'TC-S2', stepOrder: 2,
            name: 'Chặt mũi ủng (1 Máy chặt mũi)',
            workers: 1,
            normDesc: '1 NS / 1 máy chặt mũi',
            normDaily: 720, actualToday: 680, runSchedule: 'Ca hành chính',
            inputMaterial: 'Cao su tấm (`BTP-CD-02` / `BTP-CD-04`)',
            btpCode: 'BTP-TC-02', btpName: 'BTP Mũi ủng cao su đã chặt (Die-Cut Toe Cap)',
            btpUnit: 'Đôi', wipStock: 1110, qcRate: 98.0, nextStep: 'Kiểm & Đồng bộ chi tiết chặt'
          },
          {
            stepCode: 'TC-S3', stepOrder: 3,
            name: 'Chặt nẹp gót (1 Máy chặt nẹp gót)',
            workers: 1,
            normDesc: '1 NS / 1 máy chặt nẹp gót',
            normDaily: 750, actualToday: 685, runSchedule: 'Ca hành chính',
            inputMaterial: 'Cao su tấm 3 trục (`BTP-CD-04`)',
            btpCode: 'BTP-TC-03', btpName: 'BTP Nẹp gót cao su đã chặt (Die-Cut Heel Counter/Stay)',
            btpUnit: 'Đôi', wipStock: 1130, qcRate: 98.4, nextStep: 'Kiểm & Đồng bộ chi tiết chặt'
          },
          {
            stepCode: 'TC-S4', stepOrder: 4,
            name: 'Chặt phụ kiện cao su (4 Máy chặt phụ kiện)',
            workers: 4,
            normDesc: '4 NS / 4 máy chặt phụ kiện (Khóa, nẹp hông, miếng đắp)',
            normDaily: 700, actualToday: 670, runSchedule: 'Ca hành chính',
            inputMaterial: 'Cao su tấm các loại (`BTP-CD-02`)',
            btpCode: 'BTP-TC-04', btpName: 'BTP Phụ kiện cao su đã chặt (Die-Cut Rubber Accessories)',
            btpUnit: 'Đôi đồng bộ', wipStock: 1085, qcRate: 97.8, nextStep: 'Kiểm & Đồng bộ chi tiết chặt'
          },
          {
            stepCode: 'TC-S5', stepOrder: 5,
            name: 'Kiểm chất lượng & Đồng bộ bộ BTP chặt (2 Thợ kiểm + 1 Hỗ trợ 5M)',
            workers: 2,
            normDesc: '2 NS kiểm song song (+1 NS luân chuyển 5M) đạt 645 đôi/ngày theo đúng cơ cấu Size UK 3..9',
            normDaily: 650, actualToday: 645, runSchedule: 'Ca HC + Đồng bộ 5M',
            inputMaterial: 'Bộ `BTP-TC-01` + `02` + `03` + `04`',
            btpCode: 'BTP-TC-05', btpName: 'Bộ BTP Cao su chặt đã kiểm đồng bộ (QC-Synchronized Cut Rubber Kit)',
            btpUnit: 'Bộ đôi', wipStock: 960, qcRate: 97.4, nextStep: 'Chuyển Chuyền In Lụa (<12h) hoặc Kho BTP giao LVF (48h)'
          }
        ]
      }
    ],
  handoverLogs: [
      {
        id: 'BG-LVF-081',
        lvfCommand: 'AE2608206 / PO 0903174865-1',
        bootModel: 'Màu LC1783 • GERMANY (Xuất KD: 09/11/2026)',
        qtyPairs: 904,
        kitComponents: 'BTP-CV-04 (Quai) + BTP-IL-04 (In 24h) + BTP-MD-04 (Đế mài) + BTP-TC-05 (Bộ chặt) + BTP-CD-03 (Viền đùn)',
        leadTimeCheck: 'Đạt chuẩn (Ủ 24h / Kho 48h / Đế 3 ngày)',
        receiver: 'Chuyền Gò 1 & Chuyền May LVF',
        timestamp: '01/11/2026 16:30',
        status: 'Đã bàn giao LVF'
      },
      {
        id: 'BG-LVF-080',
        lvfCommand: 'AE2608207 / PO 0903174988-1',
        bootModel: 'Màu LC1785 • GERMANY (Xuất KD: 09/11/2026)',
        qtyPairs: 499,
        kitComponents: 'BTP-CV-04 (Quai) + BTP-IL-04 (In 24h) + BTP-MD-04 (Đế mài) + BTP-TC-05 (Bộ chặt) + BTP-CD-03 (Viền đùn)',
        leadTimeCheck: 'Đạt chuẩn (Ủ 24h / Kho 48h / Đế 3 ngày)',
        receiver: 'Chuyền Gò 2 & Nồi Hấp Lưu Hóa LVF',
        timestamp: '31/10/2026 17:00',
        status: 'Đã bàn giao LVF'
      },
      {
        id: 'BG-LVF-079',
        lvfCommand: 'AE2607426 / PO 0903083862-1',
        bootModel: 'Màu LC1783 • CANADA (Xuất KD: 26/10/2026)',
        qtyPairs: 350,
        kitComponents: 'BTP-CV-04 (Quai) + BTP-IL-04 (In 24h) + BTP-MD-04 (Đế mài) + BTP-TC-05 (Bộ chặt) + BTP-CD-03 (Viền đùn)',
        leadTimeCheck: 'Đạt chuẩn (Ủ 24h / Kho 48h / Đế 3 ngày)',
        receiver: 'Chuyền Gò 1 & Chuyền May LVF',
        timestamp: '20/10/2026 15:45',
        status: 'Đã bàn giao LVF'
      }
    ],
  kaizenItems: [
      {
        id: 'KZ-01',
        section: '1. Chuyền Cán Vải (9 NS) — MAN & MATERIAL',
        problem: 'Năng lực cán 5 NS đạt 2.650 đôi/ngày nhưng LVF chỉ cần 650 đôi/ngày (chỉ làm 2-3h/ngày). Làm rời rạc từng ngày gây hao hụt định mức vật tư, dư giờ công hành chính và vật tư không đồng bộ.',
        solution: 'Thiết lập lịch Gom Lô Đồng Bộ 5M: Cán vải cố định 2 ngày/tuần, In tẩy & Chặt tẩy+quai 3 ngày/tuần; điều động nhân sự dôi dư sang phụ Kiểm chặt & Đánh kẽm Mài đế để đạt POH > 95% trong giờ HC.',
        impact: 'Tiết kiệm 14% hao hụt vật tư mép vải, tăng POH chuyền Cán vải từ 62% lên 95.5%.',
        applied: true,
        segmentId: 'CAN_VAI',
        excelDifficulty: "Excel LAF, cột Khó khăn (Cán vải): Công đoạn để ra được sản phẩm tối thiểu từ 5-6 người, thời gian làm việc chỉ mất 2-3h/ngày. Các công đoạn phải làm cố định theo ngày và không rải sản lượng tính theo đồng bộ để làm sẽ dẫn đến hao hụt định mức vật tư. Thời gian làm việc các công đoạn không làm hết công suất trong giờ hành chính. Vật tư không đồng bộ."
      },
      {
        id: 'KZ-02',
        section: '2. Chuyền In Lụa (7 NS) — METHOD & MATERIAL',
        problem: 'Cao su phải nhập kho trước 12h mới in, sau in phải ủ 24h mới giao LVF. Năng lực 750đ/ngày nhưng LVF chỉ lấy 400-650đ/ngày.',
        solution: 'Áp dụng chốt chặn Barcode nhập phôi trước 11:30 sáng; gom in theo chiến dịch 5 mã màu thật (LC1783 → LC1786 → LC1787 → LC1784 → LC1785) trong giới hạn bồn ủ 24h-36h.',
        impact: 'Đảm bảo 100% lô giao LVF đủ 24h ủ khô cho toàn bộ 64.837 đôi xuất khẩu.',
        applied: true,
        segmentId: 'IN_LUA',
        excelDifficulty: "Excel LAF, cột Khó khăn (In lụa): Cao su phải được nhập kho trước 12h mới tiến hành in. Cao su in phải được nhập kho 24h mới giao qua LVF. Nếu sản lượng cần 400-650đ hiện tại đang cân đối làm trong ngày dẫn đến không đạt định mức thời gian. Nếu sản xuất theo đúng năng lực thì dẫn đến cao su in sẽ dư công suất của LVF và gối đầu nhiều ảnh hưởng chất lượng. Thợ phụ không làm ra sản phẩm sau cùng nhưng các công đoạn như vệ sinh, dán định vị đều theo sản lượng thợ in."
      },
      {
        id: 'KZ-03',
        section: '4. Cán Luyện — Ép Đế (10 NS / 12 khuôn) — MACHINE & METHOD',
        problem: 'Năng lực giờ HC chỉ đạt 450 đôi/ngày/12 khuôn, thấp hơn nhu cầu 650đ/ngày của LVF. Phải ép trước 2 tuần và dễ lệch cơ cấu Size.',
        solution: 'Phân bổ 12 khuôn Ép đế khớp chính xác tỷ lệ Size của 64.837 đôi thật (UK 6: 3 khuôn [28%], UK 5: 3 khuôn [27%], UK 7: 2 khuôn [18%], UK 4: 2 khuôn [14%], UK 8: 1 khuôn [9%], UK 3+9: 1 khuôn [4.6%]) + Lịch lùi 14 ngày.',
        impact: 'Xóa bỏ 100% tình trạng thiếu hụt đế theo Size khi ghép bộ giao LVF.',
        applied: true,
        segmentId: 'EP_DE',
        excelDifficulty: "Excel LAF, cột Khó khăn (Ép đế): Sản lượng phụ thuộc vào số lượng CCDC và thời gian làm (tăng ca hoặc đi 2 ca). Hiện tại đang triển khai ép đế trước 2 tuần. Nếu cân đối ép để đi theo BTP cao su tấm 650 đôi/ngày thì sẽ gặp khó khăn: (1) nếu màu sắc BTP cao su tấm bị lệch màu (hoặc bất kỳ lỗi nào do vật tư khác) cần đổi kế hoạch sẽ không đáp ứng kịp tiến độ dẫn đến đứt đoạn sản xuất; (2) sản lượng đang full máy và khuôn đã không đáp ứng đủ theo giờ HC, chỉ có thể tăng ca làm thêm giờ và bắt buộc phải triển khai làm trước ít nhất 3 ngày vì còn qua công đoạn mài, kiểm."
      },
      {
        id: 'KZ-04',
        section: '6. Cán Đùn (Máy 5 trục & Máy đùn) — MACHINE & MATERIAL',
        problem: 'Máy 5 trục bị sần cao su và đổi nhiều màu tốn thời gian vệ sinh máy. Máy đùn phải thay đầu ói vệ sinh 2-3 lần/ngày (10-20 phút/lần).',
        solution: 'Sắp xếp trình tự lệnh Cán đùn theo Campaign Màu của đơn hàng TVS (chạy liền mạch LC1783 chiếm 44.8% sản lượng, sau đó LC1786 23.5%, LC1787 16.0%) để giảm 65% số lần đổi màu vệ sinh máy.',
        impact: 'Giảm thời gian dừng máy đùn 45 phút/ngày, luôn nhập kho BTP trước giờ Gò 48h.',
        applied: true,
        segmentId: 'CAN_DUN',
        excelDifficulty: "Excel LAF, cột Khó khăn (Cán Đùn, 4 ý): (a) Máy cán 2 trục: 1 máy cán vào thuốc ra ép zem phục vụ máy 5 trục full thời gian, 1 máy ra chi tiết cao su ép zem phục vụ máy ói và chạy BTP khác, thời gian hoạt động 4h/ngày. (b) Máy 5 trục: 1 máy hoạt động full thời gian, 1 máy 2-3h/ngày; sản lượng ra thường gặp vấn đề chất lượng do công thức cao su, lỗi vật tư, cao su bị sần, dẫn đến sản phẩm không đạt chất lượng, chạy lại nhiều lần, không đạt định mức. Kế hoạch luôn phải hoàn thành và nhập kho trước ngày gò 48h. Sản xuất nhiều màu dẫn đến thời gian vệ sinh máy nhiều, thay đổi cách làm và điều chỉnh máy, hư hao vật tư, tốn thời gian, không đạt định mức/sản lượng. (c) Máy đùn: sản xuất nhiều chi tiết, thời gian chỉnh máy, thay đổi công cụ dụng cụ dẫn đến không đạt sản lượng, đồng thời mỗi lần chỉnh máy là hao hụt vật tư; trường hợp cao su bị lỗi không ra sản lượng phải thay đầu ói vệ sinh ngày 2-3 lần, mỗi lần 10-20 phút. (d) Máy 3 trục: thời gian hoạt động 3h/ngày."
      },
      {
        id: 'KZ-05',
        section: '7. Tổ Chặt (8 máy - 11 NS) — MAN & MEASUREMENT',
        problem: 'Máy chặt đạt định mức P. Khai Phát nhưng khâu Kiểm hàng (2 thợ kiểm song song) chỉ đạt 500 đôi/ngày do phải lựa tấm sần.',
        solution: 'Đặt cổng QC soi bề mặt tấm cao su ngay đầu ra Máy 5 trục + Bố trí khay đồng bộ theo Size UK 3..UK 9 và tăng cường 1 NS luân chuyển từ Cán vải sang phụ kiểm.',
        impact: 'Nâng năng suất khâu Kiểm chặt từ 500 đôi lên 645-650 đôi/ngày, đồng bộ 100% bộ chi tiết.',
        applied: false,
        segmentId: 'TO_CHAT',
        excelDifficulty: "Excel LAF, cột Khó khăn (Tổ Chặt): Các công đoạn chặt so với định mức thời gian của P. Khai Phát đã đạt, tuy nhiên vấn đề khi cao su tấm đầu vào bị lỗi dẫn đến sản lượng chặt đạt sản lượng nhưng chất lượng sản phẩm nhập kho đồng bộ không đạt. Sản lượng người kiểm hàng đang dựa vào số lượng sản phẩm đầu ra của máy. Để đáp ứng kịp tiến độ máy chặt thì phải bố trí 2 thợ kiểm song song, sản lượng ra chỉ đạt được 50% so với định mức."
      },
      {
        id: 'KZ-06',
        section: '3. Luyện Kín & 5. Mài Đế — MAN & METHOD',
        problem: 'Luyện kín có ngày thiếu vật tư hóa chất phải dừng lò luyện; Mài đế cần hoàn thành trước 3 ngày so với ngày Gò nhưng Đánh kẽm (1 NS = 450đ/ngày) thấp hơn Mài tay (660đ/ngày).',
        solution: 'Điều động linh hoạt nhân sự giữa Luyện kín, Cán xả và Đánh kẽm/Ủi bia để khóa cứng tiến độ Mài đế hoàn tất trước ngày vào Gò LVF đúng 72 giờ.',
        impact: 'Đảm bảo 100% đơn hàng TVS kịp Ngày xuất Kinh doanh.',
        applied: false,
        segmentId: 'LUYEN_KIN',
        excelDifficulty: "Excel LAF, cột Khó khăn (Luyện kín + Mài đế): Luyện kín — có những ngày không đủ vật tư thì sẽ không luyện kín và chỉ tập trung cán xả ép zem và ra đế. Mài đế — đang sắp xếp mài theo kế hoạch LVF, sản lượng đáp ứng 500-600đ/ngày; tuy nhiên để đáp ứng theo kế hoạch và chủ động trước vấn đề cần thay đổi thì mài đế hoàn thành trước 3 ngày so với ngày vào gò."
      }
    ],
  before5M: { "Man": 78, "Machine": 74, "Material": 70, "Method": 72, "Measurement": 80 },
  after5M: { "Man": 95, "Machine": 94, "Material": 98, "Method": 97, "Measurement": 98 },
  moldAlloc: {
    "UK 3": 0.5,
    "UK 4": 2.0,
    "UK 5": 3.0,
    "UK 6": 3.0,
    "UK 7": 2.0,
    "UK 8": 1.0,
    "UK 9": 0.5
  },
  simParams: {
    lvfDemand: 650,
    molds: 12,
    canVaiMode: "batch",
    epDeMode: "preload_ot",
    campaignBatching: true
  }
};
