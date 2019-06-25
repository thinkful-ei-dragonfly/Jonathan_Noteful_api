const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeFoldersArray } = require('./folders.fixtures')
const { makeNotesArray, makeMaliciousNote } = require('./notes.fixtures')

describe('Folders Endpoints', () => {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())
  before('clean the table', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))

  afterEach('cleanup', () => db.raw('TRUNCATE folders, notes RESTART IDENTITY CASCADE'))

  describe(`GET /api/notes`, () => {
    context(`Given no notes`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, [])
      })
    })

    context(`Given there are notes in the database`, () => {
      const testNotes = makeNotesArray()
      const testFolders = makeFoldersArray()

      beforeEach('insert folders', () => {
        return db
          .into('folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('notes')
              .insert(testNotes)
          })
      })

      it(`responds with 200 and all of the notes`, () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, testNotes)
      })
    })

    context(`Given an XSS attack note`, () => {
      const testFolders = makeFoldersArray()
      const { maliciousNote, expectedNote } = makeMaliciousNote()

      beforeEach(`insert malicious note`, () => {
        return db
          .into('folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('notes')
              .insert(maliciousNote)
          })
      })

      it(`removes XSS attack content`, () => {
        return supertest(app)
          .get(`/api/notes`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].name).to.eql(expectedNote.name)
            expect(res.body[0].content).to.eql(expectedNote.content)
          })
      })
    })
  })



  describe(`GET /api/notes/:note_id`, () => {

    context(`Given no notes`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(404, {
            error: {
              message: `Note doesn't exist`
            }
          })
      })
    })

    context(`Given there are notes in the database`, () => {
      const testNotes = makeNotesArray()
      const testFolders = makeFoldersArray()

      beforeEach(`insert notes`, () => {
        return db
          .into('folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('notes')
              .insert(testNotes)
          })
      })

      it(`responds with 200 and the specified note`, () => {
        const noteId = 2
        const expectedNote = testNotes[noteId - 1]
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(200, expectedNote)
      })
    })

    context(`Given an XsS attack note`, () => {
      const testNote = {
        id: 1,
        name: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
        content: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`,
        folder: 2,
        date_published: '2029-01-22T16:28:32.615Z'
      }
      const testFolders = makeFoldersArray()

      beforeEach(`insert malicious note`, () => {
        return db
          .into('folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('notes')
              .insert(testNote)
          })
      })

      it(`removes XSS attack content`, () => {
        return supertest(app)
          .get(`/api/notes/${testNote.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.name).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
            expect(res.body.content).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
          })
      })
    })
  })



  describe(`POST /api/notes`, () => {
    const testFolders = makeFoldersArray()

    beforeEach('insert folders', () => {
      return db
        .into('folders')
        .insert(testFolders)
    })

    it(`creates a note, responding with a 201 and the new note`, () => {
      const newNote = {
        name: 'Test new Note',
        content: 'Some new content for this note.',
        folder: 1,
        date_published: new Date().toISOString()
      }
      return supertest(app)
        .post(`/api/notes`)
        .send(newNote)
        .expect(201)
        .expect(res => {
          expect(res.body.name).to.eql(newNote.name)
          expect(res.body.content).to.eql(newNote.content)
          expect(res.body.folder).to.eql(newNote.folder)
          expect(res.body).to.have.property('id')
          expect(res.body).to.have.property('date_published')
        })
        .then(postRes => {
          supertest(app)
            .get(`/api/notes/${postRes.body.id}`)
            .expect(postRes.body)
        })
    })

    const requiredFields = ['name', 'content', 'folder']

    requiredFields.forEach(field => {
      const newNote = {
        name: 'Test new Note',
        content: 'Some new content',
        folder: 1,
        date_published: new Date().toISOString
      }

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newNote[field]

        return supertest(app)
          .post('/api/notes')
          .send(newNote)
          .expect(400), {
            error: {
              message: `Missing '${field}' in request body`
            }
          }
      })
    })

    it('removes XSS attack content from response', () => {
      const { maliciousNote, expectedNote } = makeMaliciousNote()
      return supertest(app)
        .post(`/api/notes`)
        .send(maliciousNote)
        .expect(201)
        .expect(res => {
          expect(res.body.name).to.eql(expectedNote.name)
          expect(res.body.content).to.eql(expectedNote.content)
        })
    })
  })



  describe(`DELETE /api/notes/:note_id`, () => {
    context(`Given no notes`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456
        return supertest(app)
          .delete(`/api/notes/${noteId}`)
          .expect(404, {
            error: {
              message: `Note doesn't exist`
            }
          })
      })
    })

    context(`Given there are notes in the database`, () => {
      const testNotes = makeNotesArray()
      const testFolders = makeFoldersArray()

      beforeEach(`insert notes`, () => {
        return db
          .into('folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('notes')
              .insert(testNotes)
          })
      })

      it('responds with 204 and removes the note', () => {
        const idToRemove = 2
        const expectedNotes = testNotes.filter(note => note.id !== idToRemove)
        return supertest(app)
          .delete(`/api/notes/${idToRemove}`)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/notes`)
              .expect(expectedNotes)
          )
      })
    })
  })



  describe(`PATCH /api/notes/:note_id`, () => {
    context(`Given no notes`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456
        return supertest(app)
          .patch(`/api/notes/${noteId}`)
          .expect(404, {
            error: {
              message: `Note doesn't exist`
            }
          })
      })
    })

    context(`Given there are notes in the database`, () => {
      const testNotes = makeNotesArray()
      const testFolders = makeFoldersArray()

      beforeEach(`insert folders`, () => {
        return db
          .into('folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('notes')
              .insert(testNotes)
          })
      })

      it(`responds with 204 and updates the note`, () => {
        const idToUpdate = 2
        const updateNote = {
          name: 'updated note name',
          content: 'Some updated content',
          folder: 2,
          date_published: new Date().toISOString()
        }
        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updateNote
        }
        return supertest(app)
        .patch(`/api/notes/${idToUpdate}`)
        .send(updateNote)
        .expect(204)
        .then(res =>
          supertest(app)
          .get(`/api/notes/${idToUpdate}`)
          .expect(expectedNote)
          )
      })

      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2
        return supertest(app)
        .patch(`/api/notes/${idToUpdate}`)
        .send({ irrelevantField: 'foo' })
        .expect(400, {
          error: {
            message: `Request body must contain either 'name', 'content', 'folder', or 'date_published'`
          }
        })
      })

      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2
        const updateNote = {
          name: 'updated note name'
        }
        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updateNote
        }
        return supertest(app)
        .patch(`/api/notes/${idToUpdate}`)
        .send({
          ...updateNote,
          fieldToIgnore: 'should not be in the GET response'
        })
        .expect(204)
        .then(res =>
          supertest(app)
          .get(`/api/notes/${idToUpdate}`)
          .expect(expectedNote))
      })
    })
  })
})