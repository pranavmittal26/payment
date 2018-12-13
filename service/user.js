let  con  = require('../connection');

exports.getUserDetails    = getUserDetails;
exports.insertUser        = insertUser;

function getUserDetails(opts){
    return new Promise((resolve,reject)=>{
        let sql ="SELECT * FROM tb_users WHERE 1=1 "
    let params=[];
    if(opts.user_id){
        sql+=" AND user_id=? "
        params.push(opts.user_id);
    }
    if(opts.email){
        sql+=" AND email=? "
        params.push(opts.email);
    }
    con.executeQuery(sql,params).then((result)=>{        
        if(result.length) delete result[0].password;        
        return resolve(result);
    }).catch((error)=>{
        return reject(error);
    });
    });    
}

function insertUser(opts){
    return new Promise((resolve,reject)=>{
        let sql= "INSERT INTO tb_users(first_name,last_name,email,password,phone) VALUES(?,?,?,?,?)"
        con.executeQuery(sql,opts.values).then(()=>{            
            return resolve();
        }).catch((error)=>{
            return reject(error);
        })
    })
}