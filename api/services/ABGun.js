'use strict'
const co = require('co')
let ABGunAssocation = {}
/**
 * 设置AB枪
 *
 * @param {*} cabinet
 * @param {*} gunId
 * @param {*} status
 */
const set = (gunId, status) => {
  console.log(`ABGun service : set gun ${gunId} status ${status}`)
  sails.services.redis.hset('ABGun_list', gunId, status, (err, rs) => {
    if (err) {
      console.error(`ABGun service : 设置AB枪状态失败`)
      console.error(err)
    }
  })
}
exports.set = set

/**
 * 检测是否为可用AB枪
 * hash列表内有值即为已存入, 无值为已取出
 * 检测时首先检测自己的关联枪是否已取出
 * 如果已取出 可以直接通过
 * 如果未取出 检测列表内是否存在其他处于操作流程中的枪
 * 处于操作流程中的枪 关联枪的存储状态不一致
 * @param {*} gunId
 */
const check = gunId => {
  return new Promise((resolve, reject) => {
    co(function* () {
      const _gun = yield Gun.findOne({ id: gunId })
      if (!_gun) return resolve({ pass: false, msg: '枪支不存在' })

      //检查当前枪支状态
      const _currentGun = yield sails.services.redis.hgetAsync('ABGun_list', gunId)
      if (_currentGun === 'out') return resolve({ pass: false, msg: '选择的枪支状态为已取出, 请先还枪或重置AB枪状态' })
      //检查关联枪状态
      const _associatedGun = _gun.associatedGun
      const _associatedGunIn = yield sails.services.redis.hgetAsync('ABGun_list', _associatedGun)
      if (_associatedGunIn === 'out') return resolve({ pass: true })
      //关联枪和制定枪都处于in状态, 检查其他枪支状态
      const _abgunList = yield sails.services.redis.hgetallAsync('ABGun_list')
      console.log(`ABGun status list`)
      console.log(_abgunList)
      console.log(`ABGun Association`)
      console.log(ABGunAssocation)

      let pass = true
      let currentGunId = null

      for (let key in ABGunAssocation) {
        if (_abgunList[key] !== _abgunList[ABGunAssocation[key]]) {
          //状态不一致, 判定为当前AB枪
          currentGunId = _abgunList[key] === 'in' ? key : ABGunAssocation[key]
          pass = false
          break
        }
      }
      return resolve({ pass: pass, currentGunId: currentGunId })
    }).catch(e => {
      console.error(`ABGun service : check failed`)
      console.error(e)
      reject(e)
    })
  })
}
exports.check = check

/**
 * 初始化AB枪
 *
 */
const init = () => {
  co(function* () {
    return yield Gun.find()
  }).then(guns => {
    for (let _ of guns) {
      set(_.id, _.storageStatus)
      ABGunAssocation[_.id] = _.associatedGun
    }
    console.log(`ABGun Assocation`)
    console.log(ABGunAssocation)
    console.log(`ABGun inited`)
  }).catch(e => {
    console.error(`ABGun service : init failed`)
    console.error(e)
  })
}
exports.init = init
