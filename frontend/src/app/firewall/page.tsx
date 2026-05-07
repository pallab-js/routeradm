"use client";

import { useState, useEffect } from "react";
import { usePi } from "@/hooks/usePi";
import { useStore, FirewallRule, PortForward } from "@/lib/store";
import { TopBar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Plus, Trash2, ArrowRight } from "lucide-react";

export default function FirewallPage() {
  const { piUrl, token } = useStore();
  const { fetchFirewallRules, addFirewallRule, deleteFirewallRule, fetchPortForwards, addPortForward, deletePortForward, refresh } = usePi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"firewall" | "portforward">("firewall");

  const [newRule, setNewRule] = useState<Partial<FirewallRule>>({
    port: 0,
    protocol: "tcp",
    action: "allow",
    enabled: true,
    description: "",
    source_ip: "",
  });

  const [newForward, setNewForward] = useState<Partial<PortForward>>({
    external_port: 0,
    internal_ip: "",
    internal_port: 0,
    protocol: "tcp",
    enabled: true,
    description: "",
  });

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!piUrl || !token) {
        if (mounted) setLoading(false);
        return;
      }
      await Promise.all([fetchFirewallRules(), fetchPortForwards()]);
      if (mounted) setLoading(false);
    }

    loadData();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piUrl, token]);

  const firewallRules = useStore(state => state.firewallRules);
  const portForwards = useStore(state => state.portForwards);

  const handleAddFirewallRule = async () => {
    const port = newRule.port ?? 0;
    if (port < 1 || port > 65535) {
      setError("Port must be 1-65535");
      return;
    }
    setError("");
    const rule: FirewallRule = {
      id: crypto.randomUUID(),
      port,
      protocol: newRule.protocol || "tcp",
      action: newRule.action || "allow",
      enabled: newRule.enabled ?? true,
      description: newRule.description || "",
      source_ip: newRule.source_ip || undefined,
    };
    await addFirewallRule(rule);
    setNewRule({ port: 0, protocol: "tcp", action: "allow", enabled: true, description: "", source_ip: "" });
    await fetchFirewallRules();
  };

  const handleDeleteRule = async (id: string) => {
    await deleteFirewallRule(id);
    await fetchFirewallRules();
  };

  const handleAddPortForward = async () => {
    const ext = newForward.external_port ?? 0;
    const intr = newForward.internal_port ?? 0;
    if (ext < 1 || ext > 65535 || intr < 1 || intr > 65535) {
      setError("Ports must be 1-65535");
      return;
    }
    if (!newForward.internal_ip) {
      setError("Internal IP is required");
      return;
    }
    setError("");
    const forward: PortForward = {
      id: crypto.randomUUID(),
      external_port: ext,
      internal_ip: newForward.internal_ip,
      internal_port: intr,
      protocol: newForward.protocol || "tcp",
      enabled: newForward.enabled ?? true,
      description: newForward.description,
    };
    await addPortForward(forward);
    setNewForward({ external_port: 0, internal_ip: "", internal_port: 0, protocol: "tcp", enabled: true, description: "" });
    await fetchPortForwards();
  };

  const handleDeleteForward = async (id: string) => {
    await deletePortForward(id);
    await fetchPortForwards();
  };

  if (loading) {
    return (
      <>
        <TopBar onRefresh={refresh} />
        <div className="p-8">
          <h2>Firewall & Ports</h2>
          <Card>
            <p className="text-text-secondary">Loading...</p>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar onRefresh={refresh} />
      <div className="p-8">
        <h2>Firewall & Ports</h2>

        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "firewall" ? "primary" : "secondary"}
            onClick={() => setActiveTab("firewall")}
          >
            <Shield size={16} className="mr-2" />
            Firewall Rules
          </Button>
          <Button
            variant={activeTab === "portforward" ? "primary" : "secondary"}
            onClick={() => setActiveTab("portforward")}
          >
            <ArrowRight size={16} className="mr-2" />
            Port Forwarding
          </Button>
        </div>

        {error && <p className="text-red-brand text-sm mb-4">{error}</p>}

        {activeTab === "firewall" && (
          <>
            <Card className="mb-6">
              <h3>Add Firewall Rule</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Port</label>
                  <Input
                    type="number"
                    value={newRule.port || ""}
                    onChange={e => setNewRule({ ...newRule, port: Number(e.target.value) })}
                    placeholder="80"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Protocol</label>
                  <select
                    value={newRule.protocol}
                    onChange={e => setNewRule({ ...newRule, protocol: e.target.value })}
                    className="w-full px-3 py-1.5 bg-bg-deep border border-border-subtle rounded-md text-sm text-text-primary"
                  >
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                    <option value="icmp">ICMP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Action</label>
                  <select
                    value={newRule.action}
                    onChange={e => setNewRule({ ...newRule, action: e.target.value })}
                    className="w-full px-3 py-1.5 bg-bg-deep border border-border-subtle rounded-md text-sm text-text-primary"
                  >
                    <option value="allow">Allow</option>
                    <option value="drop">Drop</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Source IP</label>
                  <Input
                    value={newRule.source_ip || ""}
                    onChange={e => setNewRule({ ...newRule, source_ip: e.target.value })}
                    placeholder="0.0.0.0/0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Description</label>
                  <Input
                    value={newRule.description || ""}
                    onChange={e => setNewRule({ ...newRule, description: e.target.value })}
                    placeholder="HTTP server"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddFirewallRule}>
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <h3>Firewall Rules</h3>
              {firewallRules.length === 0 ? (
                <p className="text-text-secondary">No firewall rules configured</p>
              ) : (
                <div className="space-y-1">
                  {firewallRules.map(rule => (
                    <div
                      key={rule.id}
                      className={`flex items-center justify-between px-3 py-2 bg-bg-elevated rounded-md ${
                        rule.enabled ? "" : "opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm">{rule.port}</span>
                        <span className="text-xs uppercase text-text-secondary">{rule.protocol}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            rule.action === "allow" ? "bg-green-900/50" : "bg-red-900/50"
                          }`}
                        >
                          {rule.action}
                        </span>
                        {rule.source_ip && (
                          <span className="text-xs text-text-muted font-mono">{rule.source_ip}</span>
                        )}
                        <span className="text-sm text-text-secondary">{rule.description}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 hover:bg-bg-deep rounded text-red-brand"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {activeTab === "portforward" && (
          <>
            <Card className="mb-6">
              <h3>Add Port Forward</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Ext Port</label>
                  <Input
                    type="number"
                    value={newForward.external_port || ""}
                    onChange={e => setNewForward({ ...newForward, external_port: Number(e.target.value) })}
                    placeholder="8080"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Protocol</label>
                  <select
                    value={newForward.protocol}
                    onChange={e => setNewForward({ ...newForward, protocol: e.target.value })}
                    className="w-full px-3 py-1.5 bg-bg-deep border border-border-subtle rounded-md text-sm text-text-primary"
                  >
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Int IP</label>
                  <Input
                    value={newForward.internal_ip || ""}
                    onChange={e => setNewForward({ ...newForward, internal_ip: e.target.value })}
                    placeholder="192.168.1.100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Int Port</label>
                  <Input
                    type="number"
                    value={newForward.internal_port || ""}
                    onChange={e => setNewForward({ ...newForward, internal_port: Number(e.target.value) })}
                    placeholder="80"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Description</label>
                  <Input
                    value={newForward.description || ""}
                    onChange={e => setNewForward({ ...newForward, description: e.target.value })}
                    placeholder="Web server"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddPortForward}>
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <h3>Port Forwards</h3>
              {portForwards.length === 0 ? (
                <p className="text-text-secondary">No port forwards configured</p>
              ) : (
                <div className="space-y-1">
                  {portForwards.map(forward => (
                    <div
                      key={forward.id}
                      className={`flex items-center justify-between px-3 py-2 bg-bg-elevated rounded-md ${
                        forward.enabled ? "" : "opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">{forward.external_port}</span>
                        <ArrowRight size={14} className="text-text-muted" />
                        <span className="font-mono text-sm">{forward.internal_ip}:{forward.internal_port}</span>
                        <span className="text-xs uppercase text-text-secondary">{forward.protocol}</span>
                        <span className="text-sm text-text-secondary">{forward.description}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteForward(forward.id)}
                        className="p-1.5 hover:bg-bg-deep rounded text-red-brand"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </>
  );
}
