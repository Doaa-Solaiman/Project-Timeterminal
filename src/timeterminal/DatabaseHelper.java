package timeterminal;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.util.Collections;
import java.util.Map;
import java.util.Properties;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;


public class DatabaseHelper
{
	private static Logger logger = LoggerFactory.getLogger(DatabaseHelper.class.getName());

	public static DataSource ds(Map database) throws Exception {
		// init database connection factory/pool
		if (database==null)
			throw new Exception("Database access is not configured.");
		if (database.get("driverClassName")!=null)
			Class.forName((String)database.get("driverClassName"));
		String jdbcUrl = (String)database.get("jdbc");
		if (!jdbcUrl.startsWith("jdbc:")) jdbcUrl = "jdbc:"+jdbcUrl;
		database.put("jdbc",jdbcUrl);
		Properties props = new Properties();
		props.put("jdbcUrl",database.get("jdbc"));
		props.put("username",database.get("user"));
		props.put("password",database.get("pass"));
		props.put("catalog",database.get("name"));
		Map pool = (Map)database.getOrDefault("pool",Collections.EMPTY_MAP);
		props.put("poolName",pool.getOrDefault("name","Hikari-timeterminal"));
		props.putAll(pool);
		HikariConfig dsc = new HikariConfig(props);
		HikariDataSource ds = new HikariDataSource(dsc);
		logger.info("Database: {}",ds.toString());
		Connection conn = ds.getConnection();
		showConnectionInfos(conn);
		conn.close();
		return ds;
	}

	public static void showConnectionInfos(Connection c) throws SQLException {
		DatabaseMetaData dbmd = c.getMetaData();
		if (dbmd==null) {
			logger.info("Connection metadata not supported");
			return;
		}
		logger.info("Database Version: {}",dbmd.getDatabaseProductVersion());
		logger.info("Driver Name: {}",dbmd.getDriverName());
		logger.info("Driver Version: {}",dbmd.getDriverVersion());
		logger.info("URL: {}",dbmd.getURL());
		logger.info("User Name: {}",dbmd.getUserName());
		logger.info("ANSI92FullSQL {}",(dbmd.supportsANSI92FullSQL() ? "supported." : "not supported."));
		logger.info("Transactions {}",(dbmd.supportsTransactions() ? "supported." : "not supported."));
	}
}
