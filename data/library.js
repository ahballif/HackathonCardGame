const CARD_LIBRARY = [
  {
    name: "Joseph Smith",
    image: "Joseph Smith.png",
    effect: "ld",
    push: "00000"
  },
  {
    name: "Susan B. Anthony",
    image: "Susan B. Anthony.png",
    effect: "ci",
    push: "00010"
  },
  {
    name: "Nephi",
    image: "Nephi.png",
    effect: "ld",
    push: "00020"
  },
  {
    name: "Gordon B. Hinckley",
    image: "Gordon B. Hinckley.png",
    effect: "ld",
    push: "00100"
  },
  {
    name: "Giuseppe Verdi",
    image: "Giuseppe Verdi.png",
    effect: "co",
    push: "00110"
  },
  {
    name: "John Lewis",
    image: "John Lewis.png",
    effect: "ci",
    push: "00120"
  },
  {
    name: "Spencer W. Kimball",
    image: "Spencer W. Kimball.png",
    effect: "ld",
    push: "00200"
  },
  {
    name: "Claudio Monteverdi",
    image: "Claudio Monteverdi.png",
    effect: "co",
    push: "00210"
  },
  {
    name: "Niels Bohr",
    image: "Niels Bohr.png",
    effect: "ph",
    push: "00220"
  },
  {
    name: "Amy Beach",
    image: "Amy Beach.png",
    effect: "co",
    push: "01000"
  },
  {
    name: "Aaron",
    image: "Aaron.png",
    effect: "ld",
    push: "01010"
  },
  {
    name: "Marie Curie",
    image: "Marie Curie.png",
    effect: "ph",
    push: "01020"
  },
  {
    name: "Lorenzo Snow",
    image: "Lorenzo Snow.png",
    effect: "ld",
    push: "01100"
  },
  {
    name: "Stephen Hawking",
    image: "Stephen Hawking.png",
    effect: "ph",
    push: "01110"
  },
  {
    name: "Isaac Newton",
    image: "Isaac Newton.png",
    effect: "ph",
    push: "01120"
  },
  {
    name: "Abinadi",
    image: "Abinadi.png",
    effect: "ld",
    push: "01200"
  },
  {
    name: "Benjamin Britten",
    image: "Benjamin Britten.png",
    effect: "co",
    push: "01210"
  },
  {
    name: "Igor Stravinsky",
    image: "Igor Stravinsky.png",
    effect: "co",
    push: "01220"
  },
  {
    name: "John Jay",
    image: "John Jay.png",
    effect: "ff",
    push: "02000"
  },
  {
    name: "John Hancock",
    image: "John Hancock.png",
    effect: "ff",
    push: "02010"
  },
  {
    name: "Dallin H. Oaks",
    image: "Dallin H. Oaks.png",
    effect: "ld",
    push: "02020"
  },
  {
    name: "George Washington",
    image: "George Washington.png",
    effect: "ff",
    push: "02100"
  },
  {
    name: "John F. Kennedy",
    image: "John F. Kennedy.png",
    effect: "ff",
    push: "02110"
  },
  {
    name: "Joseph F. Smith",
    image: "Joseph F. Smith.png",
    effect: "ld",
    push: "02120"
  },
  {
    name: "Guillaume Dufay",
    image: "Guillaume Dufay.png",
    effect: "co",
    push: "02200"
  },
  {
    name: "Russell M. Nelson",
    image: "Russell M. Nelson.png",
    effect: "ld",
    push: "02210"
  },
  {
    name: "Malcolm X",
    image: "Malcolm X.png",
    effect: "ci",
    push: "02220"
  },
  {
    name: "Alma",
    image: "Alma.png",
    effect: "ld",
    push: "10000"
  },
  {
    name: "Abish",
    image: "Abish.png",
    effect: "ld",
    push: "10010"
  },
  {
    name: "Martin Luther King Jr.",
    image: "Martin Luther King Jr..png",
    effect: "ci",
    push: "10020"
  },
  {
    name: "Bayard Rustin",
    image: "Bayard Rustin.png",
    effect: "ci",
    push: "10100"
  },
  {
    name: "Arnold Schoenberg",
    image: "Arnold Schoenberg.png",
    effect: "co",
    push: "10110"
  },
  {
    name: "Galileo Galilei",
    image: "Galileo Galilei.png",
    effect: "ph",
    push: "10120"
  },
  {
    name: "Thomas Jefferson",
    image: "Thomas Jefferson.png",
    effect: "ff",
    push: "10200"
  },
  {
    name: "Thomas S. Monson",
    image: "Thomas S. Monson.png",
    effect: "ld",
    push: "10210"
  },
  {
    name: "Antonin Dvorak",
    image: "Antonin Dvorak.png",
    effect: "co",
    push: "10220"
  },
  {
    name: "George Frideric Handel",
    image: "George Frideric Handel.png",
    effect: "co",
    push: "11000"
  },
  {
    name: "Patrick Henry",
    image: "Patrick Henry.png",
    effect: "ff",
    push: "11010"
  },
  {
    name: "Wilford Woodruff",
    image: "Wilford Woodruff.png",
    effect: "ld",
    push: "11020"
  },
  {
    name: "Mahatma Gandhi",
    image: "Mahatma Gandhi.png",
    effect: "ci",
    push: "11100"
  },
  {
    name: "Helaman",
    image: "Helaman.png",
    effect: "ld",
    push: "11110"
  },
  {
    name: "Ezra Taft Benson",
    image: "Ezra Taft Benson.png",
    effect: "ld",
    push: "11120"
  },
  {
    name: "Johannes Brahms",
    image: "Johannes Brahms.png",
    effect: "co",
    push: "11200"
  },
  {
    name: "Thurgood Marshall",
    image: "Thurgood Marshall.png",
    effect: "ci",
    push: "11210"
  },
  {
    name: "Albert Einstein",
    image: "Albert Einstein.png",
    effect: "ph",
    push: "11220"
  },
  {
    name: "Benjamin Franklin",
    image: "Benjamin Franklin.png",
    effect: "ff",
    push: "12000"
  },
  {
    name: "Ludwig Van Beethoven",
    image: "Ludwig Van Beethoven.png",
    effect: "co",
    push: "12010"
  },
  {
    name: "John Adams",
    image: "John Adams.png",
    effect: "ff",
    push: "12020"
  },
  {
    name: "Howard W. Hunter",
    image: "Howard W. Hunter.png",
    effect: "ld",
    push: "12100"
  },
  {
    name: "Fanny Mendelssohn Hensel",
    image: "Fanny Mendelssohn Hensel.png",
    effect: "co",
    push: "12110"
  },
  {
    name: "Moroni",
    image: "Moroni.png",
    effect: "ld",
    push: "12120"
  },
  {
    name: "Harold B. Lee",
    image: "Harold B. Lee.png",
    effect: "ld",
    push: "12200"
  },
  {
    name: "Brother of Jared",
    image: "Brother of Jared.png",
    effect: "ld",
    push: "12210"
  },
  {
    name: "James Farmer",
    image: "James Farmer.png",
    effect: "ci",
    push: "12220"
  },
  {
    name: "Felix Mendelssohn",
    image: "Felix Mendelssohn.png",
    effect: "co",
    push: "20000"
  },
  {
    name: "Samuel Adams",
    image: "Samuel Adams.png",
    effect: "ff",
    push: "20010"
  },
  {
    name: "Ammon",
    image: "Ammon.png",
    effect: "ld",
    push: "20020"
  },
  {
    name: "Brigham Young",
    image: "Brigham Young.png",
    effect: "ld",
    push: "20100"
  },
  {
    name: "Michelle Obama",
    image: "Michelle Obama.png",
    effect: "ff",
    push: "20110"
  },
  {
    name: "Erwin Schrodinger",
    image: "Erwin Schrodinger.png",
    effect: "ph",
    push: "20120"
  },
  {
    name: "Booker T. Washington",
    image: "Booker T. Washington.png",
    effect: "ci",
    push: "20200"
  },
  {
    name: "James Madison",
    image: "James Madison.png",
    effect: "ff",
    push: "20210"
  },
  {
    name: "Alma the Younger",
    image: "Alma the Younger.png",
    effect: "ld",
    push: "20220"
  },
  {
    name: "Roy Wilkins",
    image: "Roy Wilkins.png",
    effect: "ci",
    push: "21000"
  },
  {
    name: "John Taylor",
    image: "John Taylor.png",
    effect: "ld",
    push: "21010"
  },
  {
    name: "Richard Wagner",
    image: "Richard Wagner.png",
    effect: "co",
    push: "21020"
  },
  {
    name: "Heber J. Grant",
    image: "Heber J. Grant.png",
    effect: "ld",
    push: "21100"
  },
  {
    name: "Whitney M. Young Jr.",
    image: "Whitney M. Young Jr..png",
    effect: "ci",
    push: "21110"
  },
  {
    name: "Rosa Parks",
    image: "Rosa Parks.png",
    effect: "ci",
    push: "21120"
  },
  {
    name: "Antonio Vivaldi",
    image: "Antonio Vivaldi.png",
    effect: "co",
    push: "21200"
  },
  {
    name: "Barack Obama",
    image: "Barack Obama.png",
    effect: "ff",
    push: "21210"
  },
  {
    name: "Joseph Fielding Smith",
    image: "Joseph Fielding Smith.png",
    effect: "ld",
    push: "21220"
  },
  {
    name: "Johann Sebastian Bach",
    image: "Johann Sebastian Bach.png",
    effect: "co",
    push: "22000"
  },
  {
    name: "Alexander Hamilton",
    image: "Alexander Hamilton.png",
    effect: "ff",
    push: "22010"
  },
  {
    name: "Hildegard of Bingen",
    image: "Hildegard of Bingen.png",
    effect: "co",
    push: "22020"
  },
  {
    name: "Samuel the Lamanite",
    image: "Samuel the Lamanite.png",
    effect: "ld",
    push: "22100"
  },
  {
    name: "David O. McKay",
    image: "David O. McKay.png",
    effect: "ld",
    push: "22110"
  },
  {
    name: "George Albert Smith",
    image: "George Albert Smith.png",
    effect: "ld",
    push: "22120"
  },
  {
    name: "A. Philip Randolph",
    image: "A. Philip Randolph.png",
    effect: "ci",
    push: "22200"
  },
  {
    name: "W.E.B. Du Bois",
    image: "W.E.B. Du Bois.png",
    effect: "ci",
    push: "22210"
  },
  {
    name: "Wolfgang Amadeus Mozart",
    image: "Wolfgang Amadeus Mozart.png",
    effect: "co",
    push: "22220"
  }
];
