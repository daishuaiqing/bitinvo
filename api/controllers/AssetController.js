/**
 * AssetController
 *
 * @description :: Server-side logic for managing Assets
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
'use strict';
const fs = require('fs');
const util = require('util');
const path = require('path');
const mime = require('mime');

let markAssetNotFound = function (videoId) {
  Asset.update({ id: videoId }, { status: 'notFound' }).then((data) => {
    if (!data) {
      sails.log.error(' #### AssetController:markAssetNotFound Can not update Asset #### ');
    } else {
      sails.log.debug(' #### AssetController:markAssetNotFound update Asset success #### ');
    }
  }).catch((err) => {
    sails.log.error(' #### AssetController:error occured in markAssetNotFound #### ');
    sails.log.error(err);
  })
}
module.exports = {
  play: function (req, res, next) {
    sails.log.debug(' ##### AssetController:play #### ');
    let videoId = req.param('id');
    Asset.findOne({ id: videoId })
      .exec((err, video) => {
        if (err) {
          sails.log.error(' #### AssetController:play  can not find video');
          sails.log.error(err);
          markAssetNotFound(videoId);
          return res.badRequest('找不到您要的视频日志');
        }
        if (!video) {
          sails.log.error('#### AssetController: play no such file in local')
          return res.badRequest('找不到您要的视频日志');;
        }
        sails.log.debug(' #### AssetController:play playing ####');
        let path = video.path;
        let stat = fs.stat(path, (err, stat) => {
          if (err) {
            sails.log.error(' #### AssetController:play  can not stat video file');
            sails.log.error(err);
            markAssetNotFound(videoId);
            return res.badRequest('找不到您要的视频日志');
          }
          let total = stat.size;
          try {
            if (req.headers['range']) {
              var range = req.headers.range;
              var parts = range.replace(/bytes=/, "").split("-");
              var partialstart = parts[0];
              var partialend = parts[1];

              var start = parseInt(partialstart, 10);
              var end = partialend ? parseInt(partialend, 10) : total - 1;
              var chunksize = (end - start) + 1;
              sails.log.debug('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);

              var file = fs.createReadStream(path, { start: start, end: end });
              res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/mp4' });
              file.pipe(res);
            } else {
              sails.log.debug('ALL: ' + total);
              res.writeHead(200, { 'Content-Length': total, 'Content-Type': 'video/mp4' });
              fs.createReadStream(path).pipe(res);
            }
          } catch (e) {
            sails.log.error('#### AssetController : play error');
            sails.log.error(e);
          }
        });
      })
  },
  download: function (req, res, next) {
    sails.log.debug(' ##### AssetController:download #### ');
    let assetId = req.param('id');
    Asset.findOne({ id: assetId })
      .exec((err, asset) => {
        if (err) {
          sails.log.error(' #### AssetController:play  can not find video');
          sails.log.error(err);
          markAssetNotFound(assetId);
          return res.badRequest('找不到您要的视频日志');
        }
        sails.log.debug(' #### AssetController:play playing ####');
        if (!asset) {
          sails.log.error('#### AssetController: play no such file in local')
          return res.badRequest('找不到您要的视频日志');;
        }
        let assetPath = asset.path;
        var filename = path.basename(assetPath);
        let name = asset.name;
        let stat = fs.stat(assetPath, (err, stat) => {
          if (err) {
            sails.log.error(' #### AssetController:play  can not stat asset file');
            sails.log.error(err);
            markAssetNotFound(assetId);
            return res.badRequest('找不到您要的视频日志');
          }
          let mimetype = mime.lookup(filename);
          res.setHeader('Content-disposition', 'attachment; filename=' + filename);
          res.setHeader('Content-type', mimetype);
          let filestream = fs.createReadStream(assetPath);
          filestream.pipe(res);
        });
      })
  },
  image: function (req, res) {
    sails.log.debug(' ##### AssetController:image #### ');
    let imageId = req.param('id');
    Asset.findOne({ id: imageId })
      .exec((err, image) => {
        if (err) {
          sails.log.error(' #### AssetController:image  can not find image');
          sails.log.error(err);
          markAssetNotFound(imageId);
          return res.badRequest('找不到您要的照片');
        }
        if (!image) {
          sails.log.error('#### AssetController: image no such file in local')
          return res.badRequest('找不到您要的照片');;
        }
        sails.log.debug(' #### AssetController:image send ####');
        let path = image.path.replace(/mp4/, 'jpg');
        fs.readFile(path, 'binary', function (err, file) {
          if (err) {
            sails.log.error('#### AssetController: image readFile error');
            sails.log.error(err);
            return res.badRequest('找不到您要的照片');
          } else {
            res.writeHead(200, { 'Content-Type': 'image/jpeg' });
            res.write(file, 'binary');
            return res.end();
          }
        })
      })
  },

  delete: function (req, res) {
    const assetId = req.param('id');
    Asset.findOne({ id: assetId }).exec((err, asset) => {
      if (err) return res.serverError(err);
      if (asset && asset.path) {
        sails.services.shellproxy.rm(asset.path);
        Promise.all([
          Asset.destroy({ id: assetId }),
          ApplicationCaptured.destroy({ assetId })
        ]).then((data) => {
          return res.ok({ code: 'SUCCESS' })
        }).catch((err) => {
          return res.serverError(err);
        })
      } else {
        return res.badRequest({ code: 'NOSUCHASSET' });
      }
    })
  },

  list: function (req, res) {
    const skip = Number(req.query.skip) || 0;
    const limit = Number(req.query.limit) || 10;
    const type = req.query.type === 'image' ? 'image' : 'video';
    const start = req.query.start;
    const end = req.query.end;
    let where = { type };
    if (start && end) {
      where = Object.assign(where, { createdAt: { '>': new Date(start), '<': new Date(end) } })
    }
    Asset.count(where).exec(function (err, count) {
      if (err) {
        sails.log.error('#### AssetController : query list failed')
        sails.log.error(err);
        return res.serverError({ msg: '查询资源总数失败' });
      }
      if (count > 0) {
        Asset.find({ where, skip, limit }).sort('createdAt DESC').exec((err, data) => {
          if (err) {
            sails.log.error('#### AssetController : query list failed')
            sails.log.error(err);
            return res.serverError({ msg: '获取资源列表失败' });
          }
          return res.ok({
            skip,
            limit,
            total: count,
            data
          })
        })
      } else {
        return res.ok({
          skip,
          limit,
          total: 0,
          data: []
        })
      }
    })

  }
};
