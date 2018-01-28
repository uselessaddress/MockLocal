const _ = require('lodash')
const path = require('path')
const http = require('http')
const cors = require('cors')
const Mock = require('mockjs')
const logger = require('morgan')
const express = require('express')
const compression = require('compression')

const app = express()
const router = express.Router()

const config = require('./config')
const {
  baseURL,
  apis,
  cors: corsConfig
} = config

const ALLOWED_TYPE = ['file', 'mock']
const ALLOWED_METHOD = ['get', 'post', 'put', 'delete', 'patch']

app.use(compression())

if (_.isObject(corsConfig) && !_.isEmpty(corsConfig)) {
  app.use(cors(corsConfig))
}

const api_list = []

for (let i = 0, len = apis.length; i < len; i++) {
  const api = apis[i]
  const api_url = path.join(api.url).replace(/\\/g, '/')
  const method = _.toLower(api.method)
  const api_type = _.toLower(api.type)
  if (!_.includes(ALLOWED_TYPE, api_type)) {
    console.log(`不支持的数据类型 ${api_type}, 请选择${_.join(ALLOWED_TYPE, ', ')}数据类型！`)
    process.exit(1)
    break
  }
  if (!_.includes(ALLOWED_METHOD, method)) {
    console.log(`不支持的请求方式 ${method}, 请选择${_.join(ALLOWED_METHOD, ', ')}请求方式！`)
    process.exit(1)
    break
  }

  const app_method = _.bindKey(router, method, api_url)
  api_list.push(`${_.toUpper(method)} - ${api_url}`)
  switch (api_type) {
    case 'file':
      {
        app_method((req, res, next) => {
          const filePath = path.join(__dirname, api.data)
          return res.sendFile(filePath)
        })
      }
    case 'mock':
      {
        app_method((req, res, next) => {
          const mockData = Mock.mock(api.data)
          if (_.isString(mockData)) {
            return res.send(mockData)
          }
          return res.json(mockData)
        })
      }
    default:
      break
  }
}

console.log('==========')
console.log('[APIURL_LIST]:')
console.log(api_list.join('\n'))
console.log('==========')

app.use(logger('dev'))

app.use(baseURL, router)

app.use((req, res, next) => {
  return res.send('404 Not Found')
})

const server = http.createServer(app)

server.listen(config.port)
server.on('listening', () => {
  console.log(`Listening on port ${config.port}. http://localhost:${config.port}`)
})
server.on('error', error => {
  if (error.syscall !== 'listen') {
    throw error
  }
  const bind = typeof config.port === 'string' ?
    'Pipe ' + config.port :
    'Port ' + config.port
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges')
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(bind + ' is already in use')
      process.exit(1)
      break
    default:
      throw error
  }
})
