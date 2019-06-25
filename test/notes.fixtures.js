function makeNotesArray(){
  
  return[
    {
      id: 1,
      name: 'Note 1',
      content: 'Some content for my first note',
      folder: 1,
      date_published: new Date().toISOString() 
    },

    {
      id: 2,
      name: 'Note 2',
      content: 'Some content for my second note',
      folder: 2,
      date_published: new Date().toISOString()
    }
  ]
}

function makeMaliciousNote(){
  const maliciousNote = {
    id: 911,
    name: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    content: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`,
    folder: 2,
    date_published: new Date().toISOString()
  }

  const expectedNote = {
    ...maliciousNote,
    name: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    content:  `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
  }
  return{
    maliciousNote,
    expectedNote
  }
}

module.exports = {
  makeNotesArray,
  makeMaliciousNote
}