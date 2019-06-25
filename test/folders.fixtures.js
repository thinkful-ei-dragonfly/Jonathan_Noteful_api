function makeFoldersArray(){
  return [
    {
      id: 1,
      title: 'Folder 1'
    },

    {
      id: 2,
      title: 'Folder 2'
    },

    {
      id: 3,
      title: 'Folder 3'
    }
  ]
}

function makeMaliciousFolder(){
  const maliciousFolder = {
    id: 911,
    title: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
  }

  const expectedFolder = {
    ...maliciousFolder,
    title: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
  }
  return{
    maliciousFolder,
    expectedFolder
  }
}

module.exports = {
  makeFoldersArray,
  makeMaliciousFolder
}