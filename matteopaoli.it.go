//Copyright 2016 Matteo Paoli - mttpla@gmail.com

package main

import (
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
)

var (
	//Trace deeply info
	Trace *log.Logger
	//Info standard logs
	Info *log.Logger
	//Warning sameting to take care of
	Warning *log.Logger
	//Error somethings go wrong
	Error *log.Logger
)

//ServerInfo info printed in / page
type ServerInfo struct {
	Name    string `json:",omitempty"`
	Surname string `json:",omitempty"`
}

var serverInfo = ServerInfo{Name: "Matteo", Surname: "Paoli"}

//LogInit helpfull
func LogInit(
	traceHandle io.Writer,
	infoHandle io.Writer,
	warningHandle io.Writer,
	errorHandle io.Writer) {

	Trace = log.New(traceHandle,
		"TRACE: ",
		log.Ldate|log.Ltime|log.Lshortfile)

	Info = log.New(infoHandle,
		"INFO: ",
		log.Ldate|log.Ltime|log.Lshortfile)

	Warning = log.New(warningHandle,
		"WARNING: ",
		log.Ldate|log.Ltime|log.Lshortfile)

	Error = log.New(errorHandle,
		"ERROR: ",
		log.Ldate|log.Ltime|log.Lshortfile)
}

//HomeHandler main path
func HomeHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	serverInfoJSON, _ := json.Marshal(serverInfo)
	w.Write([]byte(string(serverInfoJSON)))
}

//NotFound manage not found path
func notFound(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotFound)

	Info.Println(fmt.Sprintf("Page Not Found: %s", r.URL))
	var msg = make(map[string]string)
	msg["Error"] = "Page not found"
	msg["URL"] = fmt.Sprintf("%s", r.URL)
	msgJSON, _ := json.Marshal(msg)
	w.Write([]byte(string(msgJSON)))
}

func main() {
	LogInit(ioutil.Discard, os.Stdout, os.Stdout, os.Stderr)
	router := mux.NewRouter()
	router.HandleFunc("/", HomeHandler)
	router.NotFoundHandler = http.HandlerFunc(notFound)
	Info.Println("Started")
	log.Fatal(http.ListenAndServe(":8000", router))

}
