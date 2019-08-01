/**
 * DefaultController
 *
 * @description :: Server-side logic for managing Dutyshifts
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

 module.exports = {
   index:function(req,res){
     return res.redirect('/m/home')
   }
 };
