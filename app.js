//response.status(400)
const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const db_path = path.join(__dirname, 'covid19IndiaPortal.db')

let db = null
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: db_path,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server started!!!')
    })
  } catch (e) {
    console.log(e.message)
    proccess.exit(1)
  }
}
initializeDbAndServer()
//API 1
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const query = `
  SELECT *
  FROM user
  WHERE username = "${username}";
  `
  const userNameQuery = await db.get(query)
  if (userNameQuery === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const passwordChecking = await bcrypt.compare(
      password,
      userNameQuery.password,
    )
    if (passwordChecking) {
      const payload = {username: username}
      const jwtToken = await jwt.sign(payload, 'secretToken')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

const tokenVAlidateChecking = (request, response, next) => {
  const authHeader = request.headers['authorization']
  let jwtTokenEl = null
  if (authHeader !== undefined) {
    jwtTokenEl = authHeader.split(' ')[1]
    console.log(jwtTokenEl)
    if (jwtTokenEl === undefined) {
      //response.status(401)
      response.send('Invalid JWT Token')
    } else {
      jwt.verify(jwtTokenEl, 'secretToken', async (error, payload) => {
        if (error) {
          response.status(401)
          response.send('Invalid JWT Token')
        } else {
          next()
        }
      })
    }
  } else {
    response.status(401)
    response.send('Invalid JWT Token')
  }
}

//API 2
app.get('/states/', tokenVAlidateChecking, async (request, response) => {
  const query = `
  SELECT 
    state_id AS stateId,
    state_name AS stateName,
    population AS population
  FROM state;
  `
  const queryResult = await db.all(query)
  response.send(queryResult)
})
//API 3
app.get(
  '/states/:stateId/',
  tokenVAlidateChecking,
  async (request, response) => {
    const {stateId} = request.params
    const query = `
  SELECT
    state_id AS stateId,
    state_name AS stateName,
    population AS population 
  FROM state
  WHERE state_id = ${stateId};
  `
    const queryResult = await db.get(query)
    response.send(queryResult)
  },
)

//API 4
app.post('/districts/', tokenVAlidateChecking, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const query = `
  INSERT INTO
    district(district_name, state_id, cases, cured, active, deaths)
  VALUES 
    ("${districtName}", ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});
  `
  const queryResult = await db.run(query)
  response.send('District Successfully Added')
})

//API 5
app.get(
  '/districts/:districtId/',
  tokenVAlidateChecking,
  async (request, response) => {
    const {districtId} = request.params
    const query = `
  SELECT
    district_id AS districtId,
    district_name AS districtName,
    state_id AS stateId,
    cases,
    cured,
    active,
    deaths
  FROM district
  WHERE district_id = ${districtId};
  `
    const queryResult = await db.get(query)
    response.send(queryResult)
  },
)

//API 6
app.delete(
  '/districts/:districtId/',
  tokenVAlidateChecking,
  async (request, response) => {
    const {districtId} = request.params
    const query = `
  DELETE
  FROM 
    district
  WHERE
    district_id = ${districtId};
  `
    const queryResult = await db.run(query)
    response.send('District Removed')
  },
)

//API 7
app.put(
  '/districts/:districtId/',
  tokenVAlidateChecking,
  async (request, response) => {
    const {districtId} = request.params
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const query = `
  UPDATE district
  SET
    district_name = '${districtName}', 
    state_id = ${stateId}, 
    cases = ${cases}, 
    cured = ${cured}, 
    active = ${active}, 
    deaths = ${deaths}
  WHERE
    district_id = ${districtId};
  `
    const queryResult = await db.run(query)
    response.send('District Details Updated')
  },
)

//API 8
app.get(
  '/states/:stateId/stats/',
  tokenVAlidateChecking,
  async (request, response) => {
    const {stateId} = request.params
    const query = `
  SELECT 
    sum(cases) AS totalCases,
    sum(cured) AS totalCured,
    sum(active) AS totalActive,
    sum(deaths) AS totalDeaths
  FROM 
    state Natural Join district
    
  WHERE
    state.state_id = ${stateId};
  `
    const queryResult = await db.get(query)
    response.send(queryResult)
  },
)
//state.state_id = district.state_id

module.exports = app
