
package timeterminal;

import java.io.FileReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Comparator;
import java.util.Date;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;

import javax.sql.DataSource;

import org.mindrot.jbcrypt.BCrypt;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.undertow.Handlers;
import io.undertow.Undertow;
import io.undertow.predicate.Predicates;
import io.undertow.server.HttpHandler;
import io.undertow.server.HttpServerExchange;
import io.undertow.server.handlers.PathHandler;
import io.undertow.server.handlers.encoding.ContentEncodingRepository;
import io.undertow.server.handlers.encoding.EncodingHandler;
import io.undertow.server.handlers.encoding.GzipEncodingProvider;
import io.undertow.server.handlers.resource.ClassPathResourceManager;
import io.undertow.server.handlers.resource.Resource;
import io.undertow.util.Headers;
import timeterminal.DbUtils.TableInfo;

public class SimpleHttpServer
{
	static Map<String,TableInfo> tables;

	public static void main(String[] args) throws Exception {
		Properties config = new Properties();
		config.load(new FileReader("app.properties"));

		boolean outputSourceMaps = config.getProperty("outputSourceMaps") == null ? false
				: Boolean.parseBoolean(config.getProperty("outputSourceMaps"));

		int httpPort = 8080;
		if (config.getProperty("httpPort") != null)
			httpPort = Integer.parseInt(config.getProperty("httpPort"));

		tables = MetadataDefinition.createTableInfos();
		DataSource ds = DatabaseHelper.ds(config);
		DbUtils.ds = ds;

//		List<Map> all = DbUtils.loadAll(tables.get("User"));
//		System.out.println("SimpleHttpServer.main() "+all);

		PathHandler ph = Handlers.path();
		ph.addPrefixPath("/api",new ApiHandler());
		ph.addPrefixPath("/admin",Handlers.resource(
//				new FileResourceManager(new File("./app-admin/target/"),1024,true,true,new String[0]));
				new ClassPathResourceManager(SimpleHttpServer.class.getClassLoader(),"app-admin/") {
					@Override
					public Resource getResource(String path) throws IOException {
						if (!outputSourceMaps && path.endsWith(".map")) return null;
						return super.getResource(path);
					}
				}));
		ph.addPrefixPath("/",Handlers.resource(
//				new FileResourceManager(new File("./app-terminal/target/"),1024,true,true,new String[0]));
				new ClassPathResourceManager(SimpleHttpServer.class.getClassLoader(),
						"app-terminal/") {
					@Override
					public Resource getResource(String path) throws IOException {
						if (!outputSourceMaps && path.endsWith(".map")) return null;
						return super.getResource(path);
					}
				}));
		HttpHandler h =
				new EncodingHandler(new ContentEncodingRepository().addEncodingHandler("gzip",
						new GzipEncodingProvider(),50,Predicates.parse("max-content-size(5)")))
								.setNext(ph);

		Undertow.Builder builder = Undertow.builder();
		Undertow undertow = builder.addHttpListener(httpPort,"0.0.0.0").setHandler(h).build();

		undertow.start();
	}

	public static class ApiHandler implements HttpHandler
	{
		final ObjectMapper objectMapper = new ObjectMapper();

		<T> T fromJson(String json, Class<T> type)
				throws JsonMappingException, JsonProcessingException {
			return objectMapper.readValue(json,type);
		}

		String toJson(Object obj) {
			try {
				return objectMapper.writeValueAsString(obj);
			} catch (Exception ex) {
				throw new RuntimeException(ex);
			}
		}

		@Override
		//handle requests method
		public void handleRequest(HttpServerExchange http) throws Exception {
			String method = http.getRequestMethod().toString();
			String path = http.getRelativePath();

			if (method.equals("POST") && path.equals("/users")) {
				http.getRequestReceiver().receiveFullString((ex, message) -> {
					try {
						Map<String,Object> userMap = fromJson(message,Map.class);
						userMap.remove("id");

						/*for checking up if the username already used before.
						 * we add validation before calling toLowerCase to avoid crashes in case frontend sends no username
						 *
						 * */
						Object unameObj = userMap.get("username");
						if (unameObj == null || unameObj.toString().isBlank()) {
							ex.setStatusCode(400);
							ex.getResponseSender()
									.send(toJson(Map.of("error","username is required")));
							return;
						}

						String username = ((String)userMap.get("username")).toLowerCase();

						TableInfo userTable = SimpleHttpServer.tables.get("User");
						List<Map> users =
								DbUtils.loadMany(userTable,"LOWER(username) = ?",username);
						if (!users.isEmpty()) {
							ex.setStatusCode(409);
							ex.getResponseHeaders().put(Headers.CONTENT_TYPE,
									"application/json; charset=UTF-8");
							ex.getResponseSender()
									.send(toJson(Map.of("error","username already exists")));
							return;
						}

						/*List<Map> users = DbUtils.loadAll(userTable);
						for (Map u : users) {
							Object uname = u.get("username");
							if (uname != null && uname.toString().toLowerCase().equals(username)) {
								ex.setStatusCode(409);
								ex.getResponseHeaders().put(Headers.CONTENT_TYPE,
										"application/json; charset=UTF-8");
								ex.getResponseSender().send(
									toJson(Map.of("error", "username already exists"))
								);
								return;
							}
						}*/

						// extract the pin
						// I should clarify in the project documentation why PIN removed from frontend

						String pin = (String)userMap.remove("pin");

						if (pin == null || !pin.matches("\\d{6}")) {
							ex.setStatusCode(400);
							ex.getResponseHeaders().put(Headers.CONTENT_TYPE,
									"application/json; charset=UTF-8");
							ex.getResponseSender()
									.send(toJson(Map.of("error","PIN must be exactly 6 digits")));
							return;
						}

						String hashedPin = BCrypt.hashpw(pin,BCrypt.gensalt());
						userMap.put("pin",hashedPin);
						userMap.put("pinMustBeChanged",true);
						userMap.put("createdAt",new Date());
						userMap.put("updatedAt",new Date());

						String id = DbUtils.save(userTable,userMap);

						ex.getResponseHeaders().put(Headers.CONTENT_TYPE,
								"application/json; charset=UTF-8");
						ex.getResponseSender().send(toJson(Map.of("id",id)));
					} catch (Exception e) {
						e.printStackTrace();
						ex.setStatusCode(500);
						ex.getResponseSender().send(toJson(Map.of("error","failed to save user")));
					}
				},StandardCharsets.UTF_8);
				return;
			}

			// to update user endpoint (admin edit)
			if (method.equals("POST") && path.startsWith("/users/")) {
				http.getRequestReceiver().receiveFullString((ex, message) -> {
					try {
						String userId = path.substring("/users/".length());

						Map<String,Object> updates = fromJson(message,Map.class);

						TableInfo userTable = SimpleHttpServer.tables.get("User");
						Map<String,Object> user = DbUtils.loadOne(userTable,userId);

						if (user == null) {
							ex.setStatusCode(404);
							ex.getResponseSender().send(toJson(Map.of("error","user not found")));
							return;
						}

						// only allow editing if PIN already changed
						if (Boolean.TRUE.equals(user.get("pinMustBeChanged"))) {
							ex.setStatusCode(403);
							ex.getResponseSender()
									.send(toJson(Map.of("error","pin must be changed first")));
							return;
						}

						// Allowed fields are:
						user.put("firstName",updates.get("firstName"));
						user.put("lastName",updates.get("lastName"));
						user.put("active",updates.get("active"));
						user.put("updatedAt",new Date());

						DbUtils.save(userTable,user);

						ex.getResponseHeaders().put(Headers.CONTENT_TYPE,
								"application/json; charset=UTF-8");
						ex.getResponseSender().send(toJson(Map.of("success",true)));

					} catch (Exception e) {
						e.printStackTrace();
						ex.setStatusCode(500);
						ex.getResponseSender()
								.send(toJson(Map.of("error","failed to update user")));
					}
				},StandardCharsets.UTF_8);
				return;
			}

			if (method.equals("GET") && path.equals("/users")) {
				try {
					TableInfo userTable = SimpleHttpServer.tables.get("User");
					// load all users from DB
					List<Map> users = DbUtils.loadAll(userTable);

					// we should not send PINs even hashed to frontend?
					for (Map u : users) {
						u.remove("pin");
					}

					http.getResponseHeaders().put(Headers.CONTENT_TYPE,
							"application/json; charset=UTF-8");
					http.getResponseSender().send(toJson(users));
				} catch (Exception e) {
					e.printStackTrace();
					http.setStatusCode(500);
					http.getResponseSender().send(toJson(Map.of("error","failed to load users")));
				}
				return;
			}
			//username checkup endpoint (to check if the inserted username is existed in the database or not)
			if (method.equals("GET") && path.startsWith("/users/by-username/")) {
				try {
					String username = path.substring("/users/by-username/".length());

					username = username.toLowerCase();

					TableInfo userTable = SimpleHttpServer.tables.get("User");

					// the database does the filtering
					List<Map> users = DbUtils.loadMany(userTable,"LOWER(username) = ?",username);

					if (users.isEmpty()) {
						http.setStatusCode(404);
						http.getResponseSender().send(toJson(Map.of("error","user not found")));
						return;
					}

					//List<Map> users = DbUtils.loadAll(userTable);

					/*for (Map<String,Object> u : users) {
						Object uname = u.get("username");
						if (uname != null && uname.toString().toLowerCase().equals(username)) {
							foundUser = u;
							break;
						}
					}
					
					if (foundUser == null) {
						http.setStatusCode(404);
						http.getResponseSender().send(toJson(Map.of("error","user not found")));
						return;
					}*/

					Map<String,Object> foundUser = users.get(0);

					// to never send PIN to frontend
					foundUser.remove("pin");

					http.getResponseHeaders().put(Headers.CONTENT_TYPE,
							"application/json; charset=UTF-8");
					http.getResponseSender().send(toJson(foundUser));
					return;

				} catch (Exception e) {
					e.printStackTrace();
					http.setStatusCode(500);
					http.getResponseSender().send(toJson(Map.of("error","failed to lookup user")));
					return;
				}
			}

			// PIN lookup endpoing logic
			if (method.equals("POST") && path.equals("/auth/pin")) {
				http.getRequestReceiver().receiveFullString((ex, body) -> {
					try {
						Map<String,Object> req = fromJson(body,Map.class);

						String userId = (String)req.get("userId");
						String pin = (String)req.get("pin");

						if (userId == null || pin == null) {
							ex.setStatusCode(400);
							ex.getResponseSender().send(toJson(Map.of("error","missing data")));
							return;
						}

						TableInfo userTable = SimpleHttpServer.tables.get("User");
						Map<String,Object> user = DbUtils.loadOne(userTable,userId);

						/*List<Map> users = DbUtils.loadAll(userTable);
						Map<String,Object> user = null;
						for (Map<String,Object> u : users) {
							if (userId.equals(u.get("id"))) {
								user = u;
								break;
							}
						}*/

						if (user == null) {
							ex.setStatusCode(404);
							ex.getResponseSender().send(toJson(Map.of("error","user not found")));
							return;
						}

						String storedHash = (String)user.get("pin");
						// the system should first check the PIN
						if (!BCrypt.checkpw(pin,storedHash)) {
							ex.setStatusCode(401);
							ex.getResponseSender().send(toJson(Map.of("error","invalid pin")));
							return;
						}

						//Then the system should check if that PIN must or not be changed
						if (Boolean.TRUE.equals(user.get("pinMustBeChanged"))) {
							ex.setStatusCode(409);
							ex.getResponseSender().send(toJson(Map.of("pinMustBeChanged",true)));
							return;
						}

						// when the operation is successful
						ex.getResponseHeaders().put(Headers.CONTENT_TYPE,
								"application/json; charset=UTF-8");

						ex.getResponseSender().send(toJson(Map.of("success",true,"id",userId)));

					} catch (Exception e) {
						e.printStackTrace();
						ex.setStatusCode(500);
						ex.getResponseSender()
								.send(toJson(Map.of("error","authentication failed")));
					}
				},StandardCharsets.UTF_8);
				return;
			}

			// change the initial PIN endpoint
			if (method.equals("POST") && path.equals("/auth/change-pin")) {
				http.getRequestReceiver().receiveFullString((ex, body) -> {
					try {
						Map<String,Object> req = fromJson(body,Map.class);

						String userId = (String)req.get("userId");
						String oldPin = (String)req.get("oldPin");
						String newPin = (String)req.get("newPin");

						if (userId == null || oldPin == null || newPin == null) {
							ex.setStatusCode(400);
							ex.getResponseSender().send(toJson(Map.of("error","missing data")));
							return;
						}

						if (newPin.length() != 6) {
							ex.setStatusCode(400);
							ex.getResponseSender().send(toJson(Map.of("error","invalid new pin")));
							return;
						}

						TableInfo userTable = SimpleHttpServer.tables.get("User");
						Map<String,Object> user = DbUtils.loadOne(userTable,userId);

						/*List<Map> users = DbUtils.loadAll(userTable);
						Map<String,Object> user = null;
						for (Map<String,Object> u : users) {
							if (userId.equals(u.get("id"))) {
								user = u;
								break;
							}
						}*/

						if (user == null) {
							ex.setStatusCode(404);
							ex.getResponseSender().send(toJson(Map.of("error","user not found")));
							return;
						}

						if (!Boolean.TRUE.equals(user.get("pinMustBeChanged"))) {
							ex.setStatusCode(400);
							ex.getResponseSender()
									.send(toJson(Map.of("error","pin change not required")));
							return;
						}

						// to validate the old PIN
						String storedHash = (String)user.get("pin");
						if (!BCrypt.checkpw(oldPin,storedHash)) {
							ex.setStatusCode(401);
							ex.getResponseSender().send(toJson(Map.of("error","invalid old pin")));
							return;
						}

						if (BCrypt.checkpw(newPin,storedHash)) {
							ex.setStatusCode(400);
							ex.getResponseSender().send(toJson(Map.of("error",
									"new pin must be different than the initial PIN")));
							return;
						}

						// Hashing the new PIN
						String newHash = BCrypt.hashpw(newPin,BCrypt.gensalt());

						user.put("pin",newHash);
						user.put("pinMustBeChanged",false);
						user.put("updatedAt",new Date());

						// save the new PIN
						DbUtils.save(userTable,user);

						ex.getResponseHeaders().put(Headers.CONTENT_TYPE,
								"application/json; charset=UTF-8");
						ex.getResponseSender().send(toJson(Map.of("success",true)));

					} catch (Exception e) {
						e.printStackTrace();
						ex.setStatusCode(500);
						ex.getResponseSender().send(toJson(Map.of("error","failed to change pin")));
					}
				},StandardCharsets.UTF_8);
				return;
			}

			/*
			 * validate eventType
			 * loading last event
			 * block after go
			 * applying some specific rules that matches our company:
				 * Only one come per day
				 * Only one breakStart per day and recording break is optional
				 * breakEnd only after breakStart
				 * Only one go per day
				 * No actions after go
				 * Block new come if previous day is open
			 * */

			// Fetch time events by date range
			if (method.equals("GET") && path.equals("/time_entry")) {
				try {
					Deque<String> fromParam = http.getQueryParameters().get("from");
					Deque<String> toParam = http.getQueryParameters().get("to");

					String from = (fromParam == null || fromParam.isEmpty()) ? null
							: fromParam.getFirst();
					String to = (toParam == null || toParam.isEmpty()) ? null : toParam.getFirst();

					if (from == null || to == null) {
						http.setStatusCode(400);
						http.getResponseSender()
								.send(toJson(Map.of("message","missing date range")));
						return;
					}

					// Convert to timestamps
					Date fromDate = java.sql.Date.valueOf(from);
					Date toDate = java.sql.Date.valueOf(to);

					// move end date to 23:59:59
					Calendar cal = Calendar.getInstance();
					cal.setTime(toDate);
					cal.set(Calendar.HOUR_OF_DAY,23);
					cal.set(Calendar.MINUTE,59);
					cal.set(Calendar.SECOND,59);
					cal.set(Calendar.MILLISECOND,999);

					Date endOfDay = cal.getTime();

					TableInfo eventTable = SimpleHttpServer.tables.get("TimeEvent");

					String sql = "SELECT * FROM " + eventTable.name
							+ " WHERE eventTime >= ? AND eventTime <= ? "
							+ " ORDER BY eventTime ASC";

					List<Map> events = DbUtils.loadManySql(eventTable,sql,
							Utils.asSqlTimestamp(fromDate).toString(),
							Utils.asSqlTimestamp(endOfDay).toString());

					http.getResponseHeaders().put(Headers.CONTENT_TYPE,
							"application/json; charset=UTF-8");

					http.getResponseSender().send(toJson(events));

				} catch (Exception e) {
					e.printStackTrace();
					http.setStatusCode(500);
					http.getResponseSender()
							.send(toJson(Map.of("message","failed to load events")));
				}
				return;
			}

			// fetch last action for user for today only
			if (method.equals("GET") && path.equals("/time_entry/last")) {
				try {
					Deque<String> userIds = http.getQueryParameters().get("userId");
					String userId =
							(userIds == null || userIds.isEmpty()) ? null : userIds.getFirst();

					if (userId == null || userId.isBlank()) {
						http.setStatusCode(400);
						http.getResponseSender()
								.send(toJson(Map.of("message","userId is required")));
						return;
					}

					Map<String,Object> last = getLastEventToday(userId);

					if (last == null) {
						http.setStatusCode(204);
						return;
					}

					http.getResponseHeaders().put(Headers.CONTENT_TYPE,
							"application/json; charset=UTF-8");

					http.getResponseSender().send(toJson(Map.of("eventType",last.get("eventType"),
							"eventTime",last.get("eventTime"))));

				} catch (Exception e) {
					e.printStackTrace();
					http.setStatusCode(500);
					http.getResponseSender()
							.send(toJson(Map.of("message","failed to load last action")));
				}
				return;
			}

			// Create time event endpoint
			if (method.equals("POST") && path.equals("/time_entry")) {

				http.getRequestReceiver().receiveFullString((ex, body) -> {

					java.util.function.Consumer<String> reject = msg -> {
						ex.setStatusCode(400);
						ex.getResponseSender().send(toJson(Map.of("message",msg)));
					};

					try {
						Map<String,Object> req = fromJson(body,Map.class);

						String userId = (String)req.get("userId");
						String eventType = (String)req.get("eventType");
						String source = (String)req.get("source");

						if (userId == null || eventType == null || source == null) {
							reject.accept("missing data");
							return;
							/*ex.setStatusCode(400);
							ex.getResponseSender().send(toJson(Map.of("message","missing data")));
							return;*/
						}

						Map<String,Object> lastToday = getLastEventToday(userId);
						String lastType =
								lastToday == null ? null : (String)lastToday.get("eventType");

						if ("come".equals(eventType) && "come".equals(lastType)) {
							reject.accept("Bereits eingecheckt.");
							return;
						}

						// Rule to block new "come" if previous day not closed
						/*if ("come".equals(eventType)) {
							Map<String,Object> lastEver = getLastEventEver(userId);
							if (lastEver != null) {
								String lastEverType = (String)lastEver.get("eventType");
						
								if (!"go".equals(lastEverType)) {
									reject.accept(
											"Der vorherige Arbeitstag wurde nicht abgeschlossen,"
													+ " bitte korrigieren Sie dies in der Administrationstabelle.");
									return;
								}
							}
						}*/

						//then the rule to prevent duplicate come and to prevent "go" without recording come
						/*if ("come".equals(eventType) && lastType != null) {
							reject.accept("Heute bereits eingecheckt.");
							return;
						}*/

						if ("breakStart".equals(eventType)) {

							// must record come first
							if (!"come".equals(lastType)) {
								reject.accept("Pause erst nach dem \"Kommen\"");
								return;
							}

							// Only one breakStart per day
							/*if (existsEventToday(userId,"breakStart")) {
								reject.accept("Heute wurde bereits eine Pause eingelegt.");
								return;
							}*/
						}

						if ("breakEnd".equals(eventType) && !"breakStart".equals(lastType)) {
							reject.accept("Keine laufende Pause");
							return;
						}

						if ("go".equals(eventType) && !"come".equals(lastType)
								&& !"breakEnd".equals(lastType)) {
							reject.accept("Auschecken ohne Einchecken nicht möglich");
							return;
						}

						/*if ("go".equals(lastType)) {
							reject.accept("Arbeitstag bereits beendet");
							return;
						}*/

						//Rule to prevent multiple "go"
						if ("go".equals(eventType) && "go".equals(lastType)) {
							reject.accept("Bereits ausgecheckt.");
							return;
						}

						if (!List.of("come","breakStart","breakEnd","go").contains(eventType)) {
							ex.setStatusCode(400);
							ex.getResponseSender()
									.send(toJson(Map.of("message","Ungültiger Ereignistyp")));
							return;
						}

						/*Date lastEventTime = last == null ? null : (Date)last.get("eventTime");
						
						boolean lastWasYesterday =
								lastEventTime == null || isDifferentDay(lastEventTime,new Date());*/

						//save event

						TableInfo eventTable = SimpleHttpServer.tables.get("TimeEvent");

						Map<String,Object> event = new LinkedHashMap<>();

						event.put("id",UUID.randomUUID().toString());
						event.put("userId",userId);
						event.put("eventType",eventType);
						event.put("eventTime",new Date());
						event.put("source",source);
						//event.put("updatedAt",null);
						//event.put("notes",null);
						//event.put("statusComplete","go".equals(eventType));
						event.put("statusComplete","go".equals(eventType) ? 1 : 0);

						DbUtils.save(eventTable,event);

						ex.getResponseHeaders().put(Headers.CONTENT_TYPE,
								"application/json; charset=UTF-8");

						ex.getResponseSender()
								.send(toJson(Map.of("eventTime",event.get("eventTime"))));

					} catch (Exception e) {
						e.printStackTrace();
						ex.setStatusCode(500);
						ex.getResponseSender()
								.send(toJson(Map.of("message","failed to save time event")));
					}
				},StandardCharsets.UTF_8);
				return;
			}

			//Admin edit time event
			/* It loads original events and insert the missing onees,
			 * stores oldEventTime and update eventTime in case of admin edits something
			 * source will be set to "admin" and not "terminal" in this case
			 * Then, a row into TimeEventChanges table will be inserted if the process was successful
			 */

			// I used startsWith instead of equals to avoid fragile exact matching.
			//if (method.equals("POST") && path.startsWith("/admin/time_entry/edit")) {
			/*if (method.equals("POST") && path.equals("/time_entry/edit")) {
			
				http.getRequestReceiver().receiveFullString((ex, body) -> {
					try {
						Map<String,Object> req = fromJson(body,Map.class);
			
						String eventId = (String)req.get("eventId");
						Number newEventTimeNum = (Number)req.get("newEventTime");
						String notes = (String)req.get("notes");
			
						if (eventId == null || newEventTimeNum == null || notes == null
								|| notes.isBlank()) {
							ex.setStatusCode(400);
							ex.getResponseSender()
									.send(toJson(Map.of("message","missing required fields")));
							return;
						}
			
						TableInfo eventTable = SimpleHttpServer.tables.get("TimeEvent");
						TableInfo changesTable = SimpleHttpServer.tables.get("TimeEventChanges");
			
						Map<String,Object> existingEvent = DbUtils.loadOne(eventTable,eventId);
			
						if (existingEvent == null) {
							ex.setStatusCode(404);
							ex.getResponseSender()
									.send(toJson(Map.of("message","event not found")));
							return;
						}
			
						String userId = (String)existingEvent.get("userId");
			
						Date oldEventTime = (Date)existingEvent.get("eventTime");
						Date newEventTime = new Date(newEventTimeNum.longValue());
			
						//to find the day of the edited event
						Date dayStart = startOfDay(oldEventTime);
			
						Calendar cal = Calendar.getInstance();
						cal.setTime(dayStart);
						cal.add(Calendar.DAY_OF_MONTH,1);
						Date nextDay = cal.getTime();
			
						String sql = "SELECT * FROM " + eventTable.name
								+ " WHERE userId = ? AND eventTime >= ? AND eventTime < ?";
			
						List<Map> userEvents = DbUtils.loadManySql(eventTable,sql,userId,
								Utils.asSqlTimestamp(dayStart).toString(),
								Utils.asSqlTimestamp(nextDay).toString());
			
						//update simulate
						for (Map e : userEvents) {
							if (eventId.equals(e.get("id"))) {
								e.put("eventTime",newEventTime);
								break;
							}
						}
						//when events are not sorted before validation, the variables overwritten in unexpected order
			
						userEvents.sort((a, b) -> {
							Date t1 = (Date)a.get("eventTime");
							Date t2 = (Date)b.get("eventTime");
							return t1.compareTo(t2);
						}); // now validation always sees chronological order.
			
						if (!isValidEventOrder(userEvents)) {
							ex.setStatusCode(400);
							ex.getResponseSender().send(toJson(
									Map.of("message","Zeitliche Reihenfolge ist nicht logisch")));
							return;
						}
			
						// save only when the logical order of actions is achieved
						existingEvent.put("eventTime",newEventTime);
						existingEvent.put("source","admin");
						DbUtils.save(eventTable,existingEvent);
			
						Map<String,Object> change = new LinkedHashMap<>();
						change.put("id",UUID.randomUUID().toString());
						change.put("eventId",eventId);
						change.put("oldEventTime",oldEventTime);
						change.put("newEventTime",newEventTime);
						change.put("changeType","update");
						change.put("updatedAt",new Date());
						change.put("notes",notes);
			
						DbUtils.save(changesTable,change);
			
						ex.getResponseHeaders().put(Headers.CONTENT_TYPE,
								"application/json; charset=UTF-8");
						ex.getResponseSender().send(toJson(Map.of("success",true)));
			
					} catch (Exception e) {
						e.printStackTrace();
						ex.setStatusCode(500);
						ex.getResponseSender()
								.send(toJson(Map.of("message","failed to edit event")));
					}
				},StandardCharsets.UTF_8);
			
				return;
			}*/

			if (method.equals("POST") && path.equals("/time_entry/edit")) {

				http.getRequestReceiver().receiveFullString((ex, body) -> {
					try {

						Map<String,Object> req = fromJson(body,Map.class);

						List<Map<String,Object>> updates =
								(List<Map<String,Object>>)req.get("updates");

						String notes = (String)req.get("notes");

						if (updates == null || updates.isEmpty() || notes == null
								|| notes.isBlank()) {

							ex.setStatusCode(400);
							ex.getResponseSender()
									.send(toJson(Map.of("message","missing required fields")));
							return;
						}

						TableInfo eventTable = SimpleHttpServer.tables.get("TimeEvent");

						TableInfo changesTable = SimpleHttpServer.tables.get("TimeEventChanges");

						// We use first event to determine day + user
						String firstEventId = (String)updates.get(0).get("eventId");

						Map<String,Object> firstEvent = DbUtils.loadOne(eventTable,firstEventId);

						if (firstEvent == null) {
							ex.setStatusCode(404);
							ex.getResponseSender()
									.send(toJson(Map.of("message","event not found")));
							return;
						}

						String userId = (String)firstEvent.get("userId");

						Date oldEventTime = (Date)firstEvent.get("eventTime");

						Date dayStart = startOfDay(oldEventTime);

						Calendar cal = Calendar.getInstance();
						cal.setTime(dayStart);
						cal.add(Calendar.DAY_OF_MONTH,1);
						Date nextDay = cal.getTime();

						String sql = "SELECT * FROM " + eventTable.name
								+ " WHERE userId = ? AND eventTime >= ? AND eventTime < ?";

						List<Map> userEvents = DbUtils.loadManySql(eventTable,sql,userId,
								Utils.asSqlTimestamp(dayStart).toString(),
								Utils.asSqlTimestamp(nextDay).toString());

						// Simulate all updates
						for (Map<String,Object> update : updates) {

							String eventId = (String)update.get("eventId");

							Number timeNum = (Number)update.get("newEventTime");

							Date newTime = new Date(timeNum.longValue());

							for (Map e : userEvents) {
								if (eventId.equals(e.get("id"))) {
									e.put("eventTime",newTime);
								}
							}
						}

						// sorting
						userEvents.sort((a, b) -> {
							Date t1 = (Date)a.get("eventTime");
							Date t2 = (Date)b.get("eventTime");
							return t1.compareTo(t2);
						});

						// validate once
						if (!isValidEventOrder(userEvents)) {

							ex.setStatusCode(400);
							ex.getResponseSender().send(toJson(
									Map.of("message","Zeitliche Reihenfolge ist nicht logisch")));
							return;
						}

						// to save all updates
						for (Map<String,Object> update : updates) {

							String eventId = (String)update.get("eventId");

							Number timeNum = (Number)update.get("newEventTime");

							Date newTime = new Date(timeNum.longValue());

							Map<String,Object> existingEvent = DbUtils.loadOne(eventTable,eventId);

							Date oldTime = (Date)existingEvent.get("eventTime");

							if (oldTime.equals(newTime)) {
								continue; // skip unchanged events
							}

							existingEvent.put("eventTime",newTime);
							existingEvent.put("source","admin");

							DbUtils.save(eventTable,existingEvent);

							Map<String,Object> change = new LinkedHashMap<>();

							change.put("id",UUID.randomUUID().toString());

							change.put("eventId",eventId);
							change.put("oldEventTime",oldTime);
							change.put("newEventTime",newTime);
							change.put("changeType","update");
							change.put("updatedAt",new Date());
							change.put("notes",notes);

							DbUtils.save(changesTable,change);
						}

						ex.getResponseHeaders().put(Headers.CONTENT_TYPE,
								"application/json; charset=UTF-8");

						ex.getResponseSender().send(toJson(Map.of("success",true)));

					} catch (Exception e) {

						e.printStackTrace();

						ex.setStatusCode(500);
						ex.getResponseSender()
								.send(toJson(Map.of("message","failed to edit event")));
					}

				},StandardCharsets.UTF_8);

				return;
			}

			// To load edited eventIds
			// GET edited events (for pencil icon)
			if (method.equals("GET") && path.equals("/time_entry/edited")) {

				Deque<String> fromParam = http.getQueryParameters().get("from");
				Deque<String> toParam = http.getQueryParameters().get("to");

				String from = fromParam != null ? fromParam.getFirst() : null;
				String to = toParam != null ? toParam.getFirst() : null;

				if (from == null || to == null) {
					http.setStatusCode(400);
					http.getResponseSender().send("Missing from/to parameters");
					return;
				}

				try {

					TableInfo eventTable = SimpleHttpServer.tables.get("TimeEvent");
					TableInfo changesTable = SimpleHttpServer.tables.get("TimeEventChanges");

					// convert date range to timestamps
					Date fromDate = java.sql.Date.valueOf(from);
					Date toDate = java.sql.Date.valueOf(to);

					Calendar cal = Calendar.getInstance();
					cal.setTime(toDate);
					cal.add(Calendar.DAY_OF_MONTH,1);
					Date nextDay = cal.getTime();

					/*
					We join time_event_changes with time_events
					so we only return edited events inside selected date range
					*/

					String sql = "SELECT c.eventId, " + " MAX(c.updatedAt) AS lastUpdatedAt, "
							+ " COUNT(*) AS changeCount " + "FROM " + changesTable.name + " c "
							+ "WHERE c.updatedAt >= ? AND c.updatedAt < ? " + "GROUP BY c.eventId";

					List<Map<String,Object>> result = new ArrayList<>();

					try (Connection conn = DbUtils.ds.getConnection();
							PreparedStatement ps = conn.prepareStatement(sql)) {

						ps.setTimestamp(1,Utils.asSqlTimestamp(fromDate));
						ps.setTimestamp(2,Utils.asSqlTimestamp(nextDay));

						try (ResultSet rs = ps.executeQuery()) {
							while (rs.next()) {

								Map<String,Object> row = new LinkedHashMap<>();
								row.put("eventId",rs.getString("eventId"));
								row.put("lastUpdatedAt",rs.getTimestamp("lastUpdatedAt"));
								row.put("changeCount",rs.getInt("changeCount"));

								result.add(row);
							}
						}
					}

					http.getResponseHeaders().put(Headers.CONTENT_TYPE,
							"application/json; charset=UTF-8");

					http.getResponseSender().send(toJson(result));

				} catch (Exception e) {
					e.printStackTrace();
					http.setStatusCode(500);
					http.getResponseSender()
							.send(toJson(Map.of("message","failed to load edited events")));
				}

				return;
			}

			// GET full eventIds history for UI display
			if (method.equals("GET") && path.equals("/time_entry/history")) {

				Deque<String> idsParam = http.getQueryParameters().get("eventIds");
				if (idsParam == null || idsParam.isEmpty()) {
					http.setStatusCode(400);
					http.getResponseSender().send("Missing eventIds parameter");
					return;
				}

				String eventIdsStr = idsParam.getFirst();
				String[] eventIds = eventIdsStr.split(",");

				try {
					TableInfo changesTable = SimpleHttpServer.tables.get("TimeEventChanges");

					String sql = "SELECT * FROM " + changesTable.name + " WHERE eventId IN ("
							+ String.join(",",java.util.Collections.nCopies(eventIds.length,"?"))
							+ ") ORDER BY updatedAt ASC";

					List<Map<String,Object>> result = new ArrayList<>();

					try (Connection conn = DbUtils.ds.getConnection();
							PreparedStatement ps = conn.prepareStatement(sql)) {

						for (int i = 0; i < eventIds.length; i++) {
							ps.setString(i + 1,eventIds[i]);
						}

						try (ResultSet rs = ps.executeQuery()) {
							while (rs.next()) {
								Map<String,Object> row = new LinkedHashMap<>();
								row.put("id",rs.getString("id"));
								row.put("eventId",rs.getString("eventId"));
								row.put("oldEventTime",rs.getTimestamp("oldEventTime"));
								row.put("newEventTime",rs.getTimestamp("newEventTime"));
								row.put("changeType",rs.getString("changeType"));
								row.put("updatedAt",rs.getTimestamp("updatedAt"));
								row.put("notes",rs.getString("notes"));
								result.add(row);
							}
						}
					}

					http.getResponseHeaders().put(Headers.CONTENT_TYPE,
							"application/json; charset=UTF-8");
					http.getResponseSender().send(toJson(result));

				} catch (Exception e) {
					e.printStackTrace();
					http.setStatusCode(500);
					http.getResponseSender()
							.send(toJson(Map.of("message","failed to load history")));
				}

				return;
			}

			// GET aggregated workdays with breakMinutes and workingMinutes
			if (method.equals("GET") && path.equals("/time_entry/workdays")) {

				Deque<String> fromParam = http.getQueryParameters().get("from");
				Deque<String> toParam = http.getQueryParameters().get("to");

				String from = fromParam != null ? fromParam.getFirst() : null;
				String to = toParam != null ? toParam.getFirst() : null;

				if (from == null || to == null) {
					http.setStatusCode(400);
					http.getResponseSender().send("Missing from/to parameters");
					return;
				}

				try {
					TableInfo eventTable = SimpleHttpServer.tables.get("TimeEvent");

					String sql = "SELECT * FROM " + eventTable.name
							+ " WHERE eventTime >= ? AND eventTime < ?";
					List<Map<String,Object>> events = new ArrayList<>();

					try (Connection conn = DbUtils.ds.getConnection();
							PreparedStatement ps = conn.prepareStatement(sql)) {

						Date fromDate = java.sql.Date.valueOf(from);
						Date toDate = java.sql.Date.valueOf(to);

						Calendar cal = Calendar.getInstance();
						cal.setTime(toDate);
						cal.add(Calendar.DAY_OF_MONTH,1);
						Date nextDay = cal.getTime();

						ps.setTimestamp(1,Utils.asSqlTimestamp(fromDate));
						ps.setTimestamp(2,Utils.asSqlTimestamp(nextDay));

						try (ResultSet rs = ps.executeQuery()) {
							while (rs.next()) {
								Map<String,Object> row = new LinkedHashMap<>();
								row.put("id",rs.getString("id"));
								row.put("userId",rs.getString("userId"));
								row.put("eventType",rs.getString("eventType"));
								row.put("eventTime",rs.getTimestamp("eventTime"));
								events.add(row);
							}
						}
					}

					List<Map<String,Object>> aggregated = aggregateWorkDays(events);

					http.getResponseHeaders().put(Headers.CONTENT_TYPE,
							"application/json; charset=UTF-8");
					System.out.println("Events fetched: " + events.size());
					System.out.println("Aggregated rows: " + aggregated.size());
					http.getResponseSender().send(toJson(aggregated));

				} catch (Exception e) {
					e.printStackTrace();
					http.setStatusCode(500);
					http.getResponseSender()
							.send(toJson(Map.of("message","failed to load workdays")));
				}

				return;
			}

			if (method.equals("GET") && path.equals("/time_entry/monthly_report")) {

				Deque<String> yearParam = http.getQueryParameters().get("year");
				Deque<String> monthParam = http.getQueryParameters().get("month");

				if (yearParam == null || monthParam == null) {
					http.setStatusCode(400);
					http.getResponseSender().send("Missing year/month");
					return;
				}

				int year = Integer.parseInt(yearParam.getFirst());
				int month = Integer.parseInt(monthParam.getFirst());

				TableInfo userTable = SimpleHttpServer.tables.get("User");

				String userSql = "SELECT id, firstName, lastName FROM " + userTable.name;

				Map<String,Map<String,Object>> usersById = new HashMap<>();

				try (Connection conn = DbUtils.ds.getConnection();
						PreparedStatement ps = conn.prepareStatement(userSql);
						ResultSet rs = ps.executeQuery()) {

					while (rs.next()) {
						Map<String,Object> u = new HashMap<>();
						u.put("id",rs.getString("id"));
						u.put("firstName",rs.getString("firstName"));
						u.put("lastName",rs.getString("lastName"));
						usersById.put(rs.getString("id"),u);
					}
				}

				try {

					LocalDate firstDay = LocalDate.of(year,month,1);
					LocalDate lastDay = firstDay.withDayOfMonth(firstDay.lengthOfMonth());

					Date from = java.sql.Date.valueOf(firstDay);
					Date to = java.sql.Date.valueOf(lastDay.plusDays(1));

					// calculate Soll-Stunden
					int workingDays = countWorkingDays(firstDay,lastDay);
					double sollHours = workingDays * 8.0;

					// Load events for month
					TableInfo eventTable = SimpleHttpServer.tables.get("TimeEvent");

					String sql = "SELECT * FROM " + eventTable.name
							+ " WHERE eventTime >= ? AND eventTime < ?";

					List<Map<String,Object>> events = new ArrayList<>();

					try (Connection conn = DbUtils.ds.getConnection();
							PreparedStatement ps = conn.prepareStatement(sql)) {

						ps.setTimestamp(1,Utils.asSqlTimestamp(from));
						ps.setTimestamp(2,Utils.asSqlTimestamp(to));

						try (ResultSet rs = ps.executeQuery()) {
							while (rs.next()) {
								Map<String,Object> row = new LinkedHashMap<>();
								row.put("id",rs.getString("id"));
								row.put("userId",rs.getString("userId"));
								row.put("eventType",rs.getString("eventType"));
								row.put("eventTime",rs.getTimestamp("eventTime"));
								events.add(row);
							}
						}
					}

					List<Map<String,Object>> days = aggregateWorkDays(events);

					// Sum per user
					Map<String,Double> istHoursPerUser = new HashMap<>();

					for (Map<String,Object> day : days) {
						String userId = (String)day.get("userId");
						long minutes = (long)day.get("workingMinutes");
						double hours = minutes / 60.0;

						istHoursPerUser.merge(userId,hours,Double::sum);
					}

					// Building the final result
					List<Map<String,Object>> report = new ArrayList<>();

					for (String userId : usersById.keySet()) {
						double ist = istHoursPerUser.getOrDefault(userId,0.0);
						double diff = ist - sollHours;

						Map<String,Object> row = new LinkedHashMap<>();
						Map<String,Object> user = usersById.get(userId);

						row.put("userId",userId);
						row.put("firstName",user != null ? user.get("firstName") : "Unknown");
						row.put("lastName",user != null ? user.get("lastName") : "Unknown");
						row.put("sollHours",sollHours);
						row.put("istHours",ist);
						row.put("overtime",diff > 0 ? diff : 0);
						row.put("minusHours",diff < 0 ? Math.abs(diff) : 0);

						report.add(row);
					}
					http.getResponseHeaders().put(Headers.CONTENT_TYPE,
							"application/json; charset=UTF-8");
					http.getResponseSender().send(toJson(report));

				} catch (Exception e) {
					e.printStackTrace();
					http.setStatusCode(500);
					http.getResponseSender().send("Error creating monthly report");
				}

				return;
			}

			http.setStatusCode(404);
			http.getResponseSender().send("Not Found");

		}
	}

	//Probably I need it later for for reports or admin logic
	/*static Map<String,Object> getLastEvent(String userId) throws Exception {
		TableInfo eventTable = tables.get("TimeEvent");
	
		List<Map> events = DbUtils.loadMany(eventTable,"userId = ? ORDER BY eventTime DESC",userId);
	
		return events.isEmpty() ? null : events.get(0);
	}*/

	static Map<String,Object> getLastEventToday(String userId) throws Exception {

		TableInfo eventTable = tables.get("TimeEvent");

		Date start = startOfDay(new Date());

		String sql = "SELECT * FROM " + eventTable.name + " WHERE userId = ? AND eventTime >= ? "
				+ " ORDER BY eventTime DESC LIMIT 1";

		List<Map> events =
				DbUtils.loadManySql(eventTable,sql,userId,Utils.asSqlTimestamp(start).toString());

		return events.isEmpty() ? null : events.get(0);
	}

	// a helper method to validate Admin edits
	static boolean isValidEventOrder(List<Map> events) {

		Date come = null;
		Date breakStart = null;
		Date breakEnd = null;
		Date go = null;

		// extract times
		for (Map e : events) {
			String type = (String)e.get("eventType");
			Date time = (Date)e.get("eventTime");

			if (time == null) continue;

			if ("come".equals(type))
				come = time;
			else if ("breakStart".equals(type))
				breakStart = time;
			else if ("breakEnd".equals(type))
				breakEnd = time;
			else if ("go".equals(type)) go = time;
		}

		// validate logical order only when both exist

		if (come != null && breakStart != null && come.after(breakStart)) return false;

		if (breakStart != null && breakEnd != null && breakStart.after(breakEnd)) return false;

		if (breakEnd != null && go != null && breakEnd.after(go)) return false;

		if (come != null && go != null && come.after(go)) return false;

		if (breakEnd != null && breakStart == null) return false;

		return true;
	}

	// a helper function to check if an event exists today(for example to block multiple break a day)
	static boolean existsEventToday(String userId, String eventType) throws Exception {
		TableInfo eventTable = tables.get("TimeEvent");
		Date start = startOfDay(new Date());

		String sql = "SELECT COUNT(*) as cnt FROM " + eventTable.name
				+ " WHERE userId = ? AND eventType = ? AND eventTime >= ?";

		try (Connection conn = DbUtils.ds.getConnection();
				PreparedStatement ps = conn.prepareStatement(sql)) {

			ps.setString(1,userId);
			ps.setString(2,eventType);
			ps.setTimestamp(3,Utils.asSqlTimestamp(start));

			try (ResultSet rs = ps.executeQuery()) {
				if (rs.next()) {
					return rs.getInt("cnt") > 0;
				}
				return false;
			}
		}
	}

	// another helper function to check if no "go" recorded, the next day must block "come"
	static Map<String,Object> getLastEventEver(String userId) throws Exception {

		TableInfo eventTable = tables.get("TimeEvent");

		String sql = "SELECT * FROM " + eventTable.name
				+ " WHERE userId = ? ORDER BY eventTime DESC LIMIT 1";

		List<Map> events = DbUtils.loadManySql(eventTable,sql,userId);

		return events.isEmpty() ? null : events.get(0);
	}

	static List<Map<String,Object>> aggregateWorkDays(List<Map<String,Object>> events) {

		// group events by user + day
		Map<String,List<Map<String,Object>>> grouped = new LinkedHashMap<>();

		for (Map<String,Object> e : events) {
			String userId = (String)e.get("userId");
			Date eventTime = (Date)e.get("eventTime");
			Date day = startOfDay(eventTime);
			String key = userId + "_" + day.getTime();

			grouped.putIfAbsent(key,new ArrayList<>());
			grouped.get(key).add(e);
		}

		List<Map<String,Object>> result = new ArrayList<>();

		for (String key : grouped.keySet()) {
			List<Map<String,Object>> dayEvents = grouped.get(key);

			// sort chronologically
			dayEvents.sort(Comparator.comparing(e -> (Date)e.get("eventTime")));

			String userId = (String)dayEvents.get(0).get("userId");
			Date date = startOfDay((Date)dayEvents.get(0).get("eventTime"));

			long workingMinutes = 0;
			long breakMinutes = 0;
			boolean isWorking = false;
			boolean isOnBreak = false;
			Date lastWorkStart = null;
			Date lastBreakStart = null;

			List<Map<String,Object>> eventsList = new ArrayList<>();

			for (Map<String,Object> e : dayEvents) {
				String type = (String)e.get("eventType");
				Date time = (Date)e.get("eventTime");

				// copy for frontend
				Map<String,Object> evCopy = new LinkedHashMap<>();
				evCopy.put("id",e.get("id"));
				evCopy.put("eventType",type);
				evCopy.put("eventTime",time);
				eventsList.add(evCopy);

				switch (type) {
					case "come":
						if (!isWorking) {
							isWorking = true;
							lastWorkStart = time;
						}
						break;
					case "breakStart":
						if (isWorking && !isOnBreak) {
							workingMinutes += (time.getTime() - lastWorkStart.getTime()) / 60000;
							isOnBreak = true;
							lastBreakStart = time;
						}
						break;
					case "breakEnd":
						if (isOnBreak) {
							breakMinutes += (time.getTime() - lastBreakStart.getTime()) / 60000;
							isOnBreak = false;
							lastWorkStart = time;
						}
						break;
					case "go":
						if (isWorking) {
							if (isOnBreak) {
								breakMinutes += (time.getTime() - lastBreakStart.getTime()) / 60000;
								isOnBreak = false;
							} else {
								workingMinutes +=
										(time.getTime() - lastWorkStart.getTime()) / 60000;
							}
							isWorking = false;
						}
						break;
				}
			}

			Map<String,Object> row = new LinkedHashMap<>();
			row.put("userId",userId);
			row.put("date",date);
			row.put("events",eventsList);
			row.put("workingMinutes",workingMinutes);
			row.put("breakMinutes",breakMinutes);
			row.put("statusComplete",!isWorking && !isOnBreak);

			result.add(row);
		}

		return result;
	}

	/*static List<Map<String,Object>> aggregateWorkDays(List<Map<String,Object>> events) {
	
		Map<String,Map<String,Object>> result = new LinkedHashMap<>();
	
		for (Map<String,Object> e : events) {
			String userId = (String)e.get("userId");
			Date eventTime = (Date)e.get("eventTime");
			String eventType = (String)e.get("eventType");
	
			// group key: userId + date
			String dayKey = userId + "_" + startOfDay(eventTime).getTime();
	
			result.putIfAbsent(dayKey,new LinkedHashMap<>());
	
			Map<String,Object> row = result.get(dayKey);
	
			row.put("userId",userId);
			row.put("date",startOfDay(eventTime));
	
			row.put(eventType,eventTime);
			row.put(eventType + "Id",e.get("id"));
		}
	
		// calculate durations
		for (Map<String,Object> row : result.values()) {
	
			Date come = (Date)row.get("come");
			Date breakStart = (Date)row.get("breakStart");
			Date breakEnd = (Date)row.get("breakEnd");
			Date go = (Date)row.get("go");
	
			long breakMinutes = 0;
			if (breakStart != null && breakEnd != null) {
				breakMinutes = (breakEnd.getTime() - breakStart.getTime()) / 60000;
			}
	
			long workingMinutes = 0;
			if (come != null && go != null) {
				workingMinutes = (go.getTime() - come.getTime()) / 60000 - breakMinutes;
			}
	
			row.put("breakMinutes",breakMinutes);
			row.put("workingMinutes",workingMinutes);
			row.put("statusComplete",come != null && go != null);
		}
	
		return new ArrayList<>(result.values());
	}*/

	static Date startOfDay(Date d) {
		Calendar cal = Calendar.getInstance();
		cal.setTime(d);
		cal.set(Calendar.HOUR_OF_DAY,0);
		cal.set(Calendar.MINUTE,0);
		cal.set(Calendar.SECOND,0);
		cal.set(Calendar.MILLISECOND,0);
		return cal.getTime();
	}

	static int countWorkingDays(LocalDate start, LocalDate end) {

		int count = 0;
		LocalDate current = start;

		while (!current.isAfter(end)) {

			DayOfWeek day = current.getDayOfWeek();

			boolean isWeekend = (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY);

			if (!isWeekend && !isGermanHoliday(current)) {
				count++;
			}

			current = current.plusDays(1);
		}

		return count;
	}

	static boolean isGermanHoliday(LocalDate date) {

		int year = date.getYear();

		// Fixed holidays
		if (date.equals(LocalDate.of(year,1,1))) return true; // Neujahr
		if (date.equals(LocalDate.of(year,5,1))) return true; // Tag der Arbeit
		if (date.equals(LocalDate.of(year,10,3))) return true; // Tag der Deutschen Einheit
		if (date.equals(LocalDate.of(year,12,25))) return true; // 1. Weihnachtstag
		if (date.equals(LocalDate.of(year,12,26))) return true; // 2. Weihnachtstag

		// Movable holidays (Easter based)
		LocalDate easterSunday = calculateEasterSunday(year);

		if (date.equals(easterSunday.minusDays(2))) return true; // Karfreitag
		if (date.equals(easterSunday.plusDays(1))) return true; // Ostermontag
		if (date.equals(easterSunday.plusDays(39))) return true; // Christi Himmelfahrt
		if (date.equals(easterSunday.plusDays(50))) return true; // Pfingstmontag

		return false;
	}

	static LocalDate calculateEasterSunday(int year) {

		int a = year % 19;
		int b = year / 100;
		int c = year % 100;
		int d = b / 4;
		int e = b % 4;
		int f = (b + 8) / 25;
		int g = (b - f + 1) / 3;
		int h = (19 * a + b - d - g + 15) % 30;
		int i = c / 4;
		int k = c % 4;
		int l = (32 + 2 * e + 2 * i - h - k) % 7;
		int m = (a + 11 * h + 22 * l) / 451;
		int month = (h + l - 7 * m + 114) / 31;
		int day = ((h + l - 7 * m + 114) % 31) + 1;

		return LocalDate.of(year,month,day);
	}

}
