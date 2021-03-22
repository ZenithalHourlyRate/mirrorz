import React, { useEffect, useState, useMemo } from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  NavLink,
} from "react-router-dom";
import Mirrors from "./Mirrors";
import ISO from "./ISO";
import Site from "./Site";
import About from "./About";
import Debug from "./Debug";
import Monitor from "./Monitor";
import UPSTREAM_LIST from "../config/upstream";
import { Mirrorz } from "../schema";
import { Parser } from "../parser";

const PROTO_REGEX = /(^https?:)?\/\//;

// eslint-disable-next-line react/display-name
export default React.memo(() => {
  const [mirrorz, setMirrorz] = useState(new Map());

  const [mirrors, setMirrors] = useState(new Map());
  const [isoinfo, setIsoinfo] = useState(new Map());
  const [site, setSite] = useState(new Map());

  const mirrorzList = useMemo(() => Array.from(mirrorz.values()), [mirrorz]);
  const mirrorsList = useMemo(() => Array.from(mirrors.values()).flat(), [mirrors]);
  const isoinfoList = useMemo(() => Array.from(isoinfo.values()).sort((a, b) => a.site.abbr.localeCompare(b.site.abbr)), [isoinfo]);
  const siteList = useMemo(() => Array.from(site.values()).sort((a, b) => a.site.abbr.localeCompare(b.site.abbr)), [site]);

  // Load all mirror configurations
  useEffect(() => {
    async function initMirror(url: string | Parser) {
      let obj: Mirrorz;
      if (typeof (url) == "string") {
        const resp = await fetch(url);
        obj = await resp.json();
      } else {
        obj = await url();
      }
      setMirrorz((original) => new Map(original.set(url, obj)));
      const { site, info, mirrors } = obj;

      const parsed = mirrors.map(
        ({ cname, url, help, size, desc, upstream, status }) => {
          const fullUrl = url.match(PROTO_REGEX) ? url : site.url + url;
          const helpUrl =
            (help === "" || help === undefined || help === null)
              ? null
              : help.match(PROTO_REGEX)
                ? help
                : site.url + help;
          return {
            cname,
            full: fullUrl,
            help: helpUrl,
            upstream,
            desc,
            status: status === undefined ? "U" : status,
            size,
            source: site.abbr,
            note: site.note,
          };
        }
      );
      setMirrors((original) => new Map(original.set(url, parsed)));

      setSite((original) => new Map(original.set(url, { site, parsed })));

      const fullinfo = info.map(({ category, distro, urls }) => {
        const fullUrls = urls.map(({ name, url }) => {
          return {
            name: name,
            url: url.match(PROTO_REGEX) ? url : site.url + url,
          };
        });
        return {
          category,
          distro,
          urls: fullUrls,
        };
      });
      setIsoinfo((original) => new Map(original.set(url, { site, info: fullinfo })));
    }

    // Fires
    for (const mirror of UPSTREAM_LIST) initMirror(mirror);

    const interval = setInterval(() => {
      console.log("Page", document.visibilityState);
      if (document.visibilityState === "visible") {
        console.log("Refresh data");
        for (const mirror of UPSTREAM_LIST) initMirror(mirror);
      }
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <div id="app-container">
        <div className="sidebar">
          <NavLink
            to="/"
            activeClassName="active"
            isActive={(_, location) => {
              if (
                location.pathname === "/" ||
                (!location.pathname.startsWith("/list") &&
                  !location.pathname.startsWith("/site") &&
                  !location.pathname.startsWith("/about") &&
                  !location.pathname.startsWith("/debug") &&
                  !location.pathname.startsWith("/monitor"))
              ) {
                return true;
              }
              return false;
            }}
          >
            <img src="/static/img/mirrorz.svg" className="sidebar-logo" alt="ISO" />
          </NavLink>
          <NavLink to="/list" activeClassName="active">
            <h2>List</h2>
          </NavLink>
          <NavLink to="/site" activeClassName="active">
            <h2>Site</h2>
          </NavLink>
          <NavLink to="/about" activeClassName="active">
            <h2>About</h2>
          </NavLink>
        </div>
        <main>
          <Switch>
            <Route path="/list">
              <Mirrors mirrors={mirrorsList} />
            </Route>
            <Route path="/site">
              <Site site={siteList} />
            </Route>
            <Route path="/about">
              <About site={siteList} />
            </Route>
            <Route path="/debug">
              <Debug mirrorz={mirrorzList} />
            </Route>
            <Route path="/monitor">
              <Monitor />
            </Route>
            <Route path="*">
              <ISO isoinfo={isoinfoList} />
            </Route>
          </Switch>
        </main>
      </div>
    </Router>
  );
});
