// Pseudocode for action valdication logic

// to record coming logic
if action == "come":
	#ERROR 1 "user already checked in"
	if lastAction == "come":
	return Error "Sie sind bereits angemeldet"
	
	#ERROR 2 "user already on break action or end their break "
	if lastAction =="breakStart" OR lastAction=="breakEnd":
	return Error "Sie befinden sich noch in der Pause"
	
	#ALLOWED SCENARIO 1 "user did not check in, normal morning coming"
	if action !="come":
		record come
		return success

	#ALLOWED SCENARIO 2 "user forgets to record go yesterday"
	"previous day ended without checkin out, the shift is openeing for 10 hours after checking in"
	if action !="go"
	//previous shift status is incomplete
		record come
		return success
		
	#FALLBACK "if system does not recognize the action"
	return Error "Unerwarteter Fehler. Bitte Administrator kontaktieren"

	==================================================================================
	
// to record starting break logic

if action == "breakStart":
	#ERROR 1 "user did not check in, they can't start break without checking in first"
	if lastAction !="come":
		return Error "Pause ist nicht möglich. Sie sind nicht angemeldet"
		
	#ERROR 2 "user is already on break"
	if lastAction == "breakStart":
		return Error "Sie sind bereits in der Pause."
		
	#ERROR 3 "user already used their break"
	if lastAction == "breakStart" AND "breakEnd" == true?
		return Error "Pause bereits genommen."
	
	#ERROR 4 "Strating the break so early before 4 hours after recording come (optional)"
	if time_since_come < 4 hours:
		return error "Pause zu früh. Trotzdem beginnen?"
		
	#ALLOWED SCENARIO 1 "user has correctly checked in"
		if lastAction == "come":
			record breakStart
			return success
	
	#FALLBACK "if system does not recognize the action"
	return Error "Unerwarteter Fehler. Bitte Administrator kontaktieren"
	
	==================================================================================
// to record ending break logic
	
if action == "breakEnd":
	#ERROR 1 "user did not check in first"
	if lastAction !="come":
		return Error "Sie sind nicht angemeldet. Sie müssen zuerst kommen buchen!"
		
	#ERROR 2 "user did not record breakStart first"
	if lastAction !="breakStart":
		return Error "Sie haben keine Pause begonnen"
		
	#ERROR 3 "user ends their break so fast as it should be (optional)"
	if action.breakEnd < 5 minutes:
		return error "Pause zu kurz"
		
	#ERROR 4 "user already ended their break today"
	if lastAction == "endBreak":
		return Error "Sie haben Ihre Pause bereits beendet"
	
	#ALLOWED SCENARIO 1 "user is currently at work and recorded breakStart"
	if action.come == true && action.breakStart== true
				record breakEnd
				return success
		
	#FALLBACK "if system does not recognize the action"
	return Error "Unerwarteter Fehler. Bitte Administrator kontaktieren"
	
	==================================================================================

// to record go logic
		
if  action == "go":
	#ERROR 1 "user never checked in"
	if action.come == null:
		return Error "Sie sind nicht angemeldet"
		
	#ERROR 2 "user already on a break and did not end it"
	if action.breakEnd == null:
		return Error "Bitte zuerst Pause beenden"
		
	#ERROR 3 "user already recorded go"
	if action.go == true:
		return Error "Sie haben bereits 'Gehen' gebucht."
	
	#ERROR 4 "user wants to record go so early after recording come"
	if lastAction === "come" < 15 minutes:
		return error "Gehen zu früh"
	
	#ALLOWED SCENARIO 1 "user is currently at work and recorded breakEnd"
	if action.come == true && action.breakEnd== true
		record go
		return sucess
												
// what should happen if the user forgets to record "go"?

if user did not check out:
	close the day's shift with status = incomplete
	allow new "come" in the next day
