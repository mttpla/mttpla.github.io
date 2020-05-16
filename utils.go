//Copyright 2019 Matteo Paoli - mttpla@gmail.com

package main

import (
	"io"
	"log"
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
