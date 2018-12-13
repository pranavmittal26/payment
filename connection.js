let mysql                            = require('mysql');

exports.connect                      = connect;
exports.rollbackTransaction          = rollbackTransaction;
exports.executeQuery                 = executeQuery;
exports.getConnectionForTransaction  = getConnectionForTransaction;
exports.start                        = start;
exports.commitTransaction            = commitTransaction;
exports.executeTransaction           = executeTransaction;

function connect(){
    let conObj = mysql.createConnection({
        host     : "localhost",
        user     : "root",
        password : "",
        database : 'stripe'
    });
    global.connection = conObj;
    
    connection.connect(function(error){
        if(error) { throw error }
        console.log("connected to mysql");
    });
}

function getConnectionForTransaction(){
    return new Promise((resolve,reject)=>{
        return resolve(connection)
    });
}

function start(con){
    return new Promise((resolve,reject)=>{
        con.startTransaction(function(error){
            if(error){
                console.log("error",error);
                return reject();
            }
            return resolve();
        });
    });
}

function commitTransaction(connect){
    return new Promise((resolve,reject)=>{
        connect.commit(function(err){
            if(err){
                console.log("error",err);
                rollbackTransaction(connect).
                then(()=>{
                    return reject()
                }) .catch((ex)=>{
                    return reject(ex);
                })
            }
            return resolve();
        })
    })
}

function rollbackTransaction(data){
    return new Promise((resolve,reject)=>{
        if(!data){
            return reject("Transaction can't start");
        }
        data.rollback(function(err){
            if(err){
                console.log("error",err);
                return reject(err)
            }
            return resolve();
        });
    });
}

function executeTransaction(sql,values,connect){
    return new Promise((resolve,reject)=>{
       var s = connect.query(sql, values, function(error,result){   
            console.log(">>>>>>>>>>",s.sql)         
            if(error){
                console.log("error",error);
                rollbackTransaction(connect)
                .then(()=>{
                    return reject(error);
                }) .catch((ex)=>{
                    return reject(ex);
                })
            } else {
                return resolve(result);
            }
        });
    });
}

function executeQuery(sql, values){
    return new Promise((resolve,reject)=>{
        let s = connection.query(sql,values, function(err,result){
            console.log(">>>>>>>>>>",s.sql)
            if(err){
                console.log("error",err);
                return reject(err);
            }
            return resolve(result);
        })
    })
}
