package timeterminal;

import java.util.LinkedHashMap;
import java.util.Map;

import timeterminal.DbUtils.TableInfo;

public class MetadataDefinition
{
	public static Map<String,TableInfo> createTableInfos() {
		Map<String,TableInfo> infos = new LinkedHashMap<>();
		Map<String,String> columns;

		columns = new LinkedHashMap<>();
		columns.put("id","string"); //primary key
		columns.put("username","string");
		columns.put("firstName","string");
		columns.put("lastName","string");
		columns.put("pin","string");
		columns.put("pinMustBeChanged","boolean");
		columns.put("active","boolean");
		columns.put("createdAt","timestamp");
		columns.put("updatedAt","timestamp");

		infos.put("User",new TableInfo("users","user-",columns));

		columns = new LinkedHashMap<>();
		columns.put("id","string");
		columns.put("userId","string"); // foreign key
		columns.put("eventType","string");// come, breakStart, breakEnd, go
		columns.put("eventTime","timestamp");//when that event/action was done
		columns.put("source","string"); // from where that event or action was done
		columns.put("statusComplete","boolean");

		infos.put("TimeEvent",new TableInfo("time_events","te-",columns));

		columns = new LinkedHashMap<>();
		columns.put("id","string");
		columns.put("eventId","string"); // foreign key
		columns.put("oldEventTime","timestamp");
		columns.put("newEventTime","timestamp");
		columns.put("changeType","string"); //update or insert or delete
		columns.put("updatedAt","timestamp"); // the time the admin made that edit
		columns.put("notes","string"); //explanation for that edit/ change

		infos.put("TimeEventChanges",new TableInfo("time_event_changes","tech-",columns));

		return infos;
	}
}
